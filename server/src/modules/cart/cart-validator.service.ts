import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.config';

export interface ValidatedItem {
  menuItem: any;
  effectivePrice: number; // cents — base price or store override
  modifiers: Array<{
    id: string;
    name: string;
    group_id: string;
    group_name: string;
    price_adjustment: number;
  }>;
  unitPrice: number; // cents — item + all modifiers
}

/**
 * Validates a menu item + modifier selection against the database.
 * Used by both cart operations and checkout to ensure consistency.
 *
 * Validation checks:
 * 1. Item exists and is active
 * 2. Item is available at the specified store
 * 3. All modifier IDs exist and are active
 * 4. All modifiers belong to groups linked to this item
 * 5. Required groups have at least min_selections
 * 6. No group exceeds max_selections
 * 7. Single-select groups have at most 1 selection
 */
@Injectable()
export class CartValidatorService {
  constructor(private readonly supabase: SupabaseService) {}

  async validateItem(
    menuItemId: string,
    storeId: string,
    modifierIds: string[],
  ): Promise<ValidatedItem> {
    const admin = this.supabase.getAdminClient();

    // 1. Fetch menu item
    const { data: menuItem } = await admin
      .from('menu_items')
      .select('*')
      .eq('id', menuItemId)
      .eq('is_active', true)
      .single();

    if (!menuItem) {
      throw new BadRequestException(`Menu item not found or is inactive`);
    }

    // 2. Check store availability and get effective price
    const { data: storeAvail } = await admin
      .from('location_menu_items')
      .select('*')
      .eq('menu_item_id', menuItemId)
      .eq('location_id', storeId)
      .eq('is_available', true)
      .single();

    if (!storeAvail) {
      throw new BadRequestException(
        `${menuItem.name} is not available at this location`,
      );
    }

    const effectivePrice = storeAvail.price_override ?? menuItem.base_price;

    // 3. Get all modifier groups linked to this item
    const { data: groupLinks } = await admin
      .from('menu_item_modifier_groups')
      .select('modifier_group_id')
      .eq('menu_item_id', menuItemId);

    const linkedGroupIds = (groupLinks || []).map(
      (l: any) => l.modifier_group_id,
    );

    // 4. If no modifiers selected and no groups are linked, we're done
    if (modifierIds.length === 0 && linkedGroupIds.length === 0) {
      return {
        menuItem,
        effectivePrice,
        modifiers: [],
        unitPrice: effectivePrice,
      };
    }

    // 5. Fetch all linked groups with their modifiers
    let groups: any[] = [];
    let allModifiers: any[] = [];

    if (linkedGroupIds.length > 0) {
      const { data: groupData } = await admin
        .from('modifier_groups')
        .select('*')
        .in('id', linkedGroupIds);
      groups = groupData || [];

      const { data: modData } = await admin
        .from('modifiers')
        .select('*')
        .in('group_id', linkedGroupIds)
        .eq('is_active', true);
      allModifiers = modData || [];
    }

    // 6. Validate each selected modifier
    const validModifierIds = new Set(allModifiers.map((m: any) => m.id));
    const selectedModifiers: ValidatedItem['modifiers'] = [];

    for (const modId of modifierIds) {
      if (!validModifierIds.has(modId)) {
        throw new BadRequestException(
          `Modifier ${modId} is not valid for ${menuItem.name}`,
        );
      }

      const mod = allModifiers.find((m: any) => m.id === modId);
      const group = groups.find((g: any) => g.id === mod.group_id);

      selectedModifiers.push({
        id: mod.id,
        name: mod.name,
        group_id: group.id,
        group_name: group.name,
        price_adjustment: mod.price_adjustment,
      });
    }

    // 7. Validate group selection rules
    for (const group of groups) {
      const selectionsInGroup = selectedModifiers.filter(
        (m) => m.group_id === group.id,
      );
      const count = selectionsInGroup.length;

      // Required groups must have at least min_selections
      if (group.is_required && count < group.min_selections) {
        throw new BadRequestException(
          `"${group.display_name || group.name}" requires at least ${group.min_selections} selection(s)`,
        );
      }

      // Cannot exceed max_selections
      if (count > group.max_selections) {
        throw new BadRequestException(
          `"${group.display_name || group.name}" allows at most ${group.max_selections} selection(s)`,
        );
      }

      // Single-select groups can have at most 1
      if (group.type === 'single' && count > 1) {
        throw new BadRequestException(
          `"${group.display_name || group.name}" allows only one selection`,
        );
      }
    }

    // 8. Calculate unit price
    const modifierTotal = selectedModifiers.reduce(
      (sum, m) => sum + m.price_adjustment,
      0,
    );
    const unitPrice = effectivePrice + modifierTotal;

    return {
      menuItem,
      effectivePrice,
      modifiers: selectedModifiers,
      unitPrice,
    };
  }
}
