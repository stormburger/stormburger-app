-- ============================================================
-- Migration 002: Update menu to match stormburger.com
-- Clears old seed data and replaces with real menu
-- ============================================================

-- Clear existing menu data (order matters for FK constraints)
DELETE FROM menu_item_modifier_groups;
DELETE FROM modifiers;
DELETE FROM modifier_groups;
DELETE FROM location_menu_items;
DELETE FROM menu_items;

-- ============================================================
-- MENU ITEMS — real prices from stormburger.com/menu
-- ============================================================

-- Burgers
INSERT INTO menu_items (name, description, category, base_price, sort_order, is_featured) VALUES
('Classic StormBurger', 'Fresh buns, homemade Storm Sauce, 4oz all-natural patty, American cheese, pickles, onions, tomato, lettuce', 'burgers', 599, 1, true),
('Double Classic StormBurger', 'Fresh buns, homemade Storm Sauce, two 4oz all-natural patties, American cheese, pickles, onions, tomato, lettuce', 'burgers', 849, 2, false),
('Bacon BBQ Burger', 'Fresh buns, BBQ sauce, 4oz all-natural patty, American cheese, bacon, onion straws', 'burgers', 799, 3, false),
('Jalapeño Lightning Burger', 'Fresh buns, homemade avocado crema, homemade Storm Sauce, 4oz all-natural patty, Swiss cheese, grilled onions, jalapeños', 'burgers', 699, 4, false),
('Kids Burger', 'Fresh buns, 4oz all-natural patty, American cheese', 'burgers', 599, 5, false),
('Turkey Burger', 'Two 2oz turkey patties, lettuce, tomato, cheese, onions, pickles, burger sauce', 'burgers', 699, 6, false);

-- Chicken
INSERT INTO menu_items (name, description, category, base_price, sort_order) VALUES
('Chicken Sandwich', 'Fresh buns, mayo, all-natural hand-breaded chicken, pickles', 'chicken', 699, 10),
('Spicy Chicken Sandwich', 'Fresh buns, homemade spicy mayo, homemade Thunder Sauce, all-natural hand-breaded chicken, pickles', 'chicken', 699, 11),
('Deluxe Chicken Sandwich', 'Fresh buns, mayo, all-natural hand-breaded chicken, tomatoes, Swiss cheese, homemade kale slaw', 'chicken', 799, 12),
('Spicy Deluxe Chicken Sandwich', 'Fresh buns, homemade spicy mayo, homemade Thunder Sauce, all-natural hand-breaded chicken, tomatoes, Swiss cheese, homemade kale slaw', 'chicken', 799, 13),
('Chicken Strips', 'All-natural hand-breaded chicken strips', 'chicken', 699, 14);

-- Combos
INSERT INTO menu_items (name, description, category, base_price, sort_order, is_featured) VALUES
('Classic StormBurger Combo', 'Classic StormBurger with fries and a drink', 'combos', 1199, 20, true),
('Double Classic StormBurger Combo', 'Double Classic with fries and a drink', 'combos', 1449, 21, false),
('Bacon BBQ Burger Combo', 'Bacon BBQ Burger with fries and a drink', 'combos', 1399, 22, false),
('Jalapeño Lightning Burger Combo', 'Jalapeño Lightning Burger with fries and a drink', 'combos', 1399, 23, false),
('Kids Combo', 'Kids Burger with fries and a drink', 'combos', 1199, 24, false),
('Chicken Sandwich Combo', 'Chicken Sandwich with fries and a drink', 'combos', 1299, 25, false),
('Deluxe Chicken Sandwich Combo', 'Deluxe Chicken Sandwich with fries and a drink', 'combos', 1399, 26, false),
('Spicy Chicken Sandwich Combo', 'Spicy Chicken Sandwich with fries and a drink', 'combos', 1299, 27, false),
('Spicy Deluxe Chicken Sandwich Combo', 'Spicy Deluxe Chicken Sandwich with fries and a drink', 'combos', 1399, 28, false),
('Chicken Strips Combo', 'Chicken Strips with fries and a drink', 'combos', 1299, 29, false);

-- Sides
INSERT INTO menu_items (name, description, category, base_price, sort_order) VALUES
('French Fries', 'Classic irresistible fries', 'sides', 399, 30),
('Onion Rings', 'Homemade and handcrafted fresh onion rings', 'sides', 499, 31);

-- Drinks
INSERT INTO menu_items (name, description, category, base_price, sort_order) VALUES
('Coke', 'Regular fountain drink', 'drinks', 299, 40),
('Coke Zero', 'Zero sugar fountain drink', 'drinks', 299, 41),
('Barqs Root Beer', 'Classic root beer', 'drinks', 299, 42),
('Peach Tea', 'Refreshing peach tea', 'drinks', 299, 43),
('Fruit Punch', 'Sweet fruit punch', 'drinks', 299, 44),
('Sprite', 'Crisp lemon-lime', 'drinks', 299, 45),
('Cherry Coke', 'Cherry-flavored Coke', 'drinks', 299, 46),
('Fanta Strawberry', 'Strawberry-flavored Fanta', 'drinks', 299, 47);

-- Shakes
INSERT INTO menu_items (name, description, category, base_price, sort_order) VALUES
('Vanilla Shake', 'Creamy, smooth vanilla milkshake', 'desserts', 499, 50),
('Chocolate Shake', 'Creamy, bold chocolate milkshake', 'desserts', 499, 51),
('Mix Shake', 'Combination of vanilla and chocolate milkshake', 'desserts', 499, 52);

-- Sauces (add-on items)
INSERT INTO menu_items (name, description, category, base_price, sort_order) VALUES
('Storm Sauce', 'Homemade classic signature burger sauce', 'sides', 100, 60),
('BBQ Sauce', 'Savory, classic BBQ sauce', 'sides', 100, 61),
('Honey Mustard', 'Sweet and tangy, homemade honey mustard', 'sides', 100, 62),
('Spicy Mayo', 'Rich, homemade spicy mayo packed with a punch', 'sides', 100, 63),
('Avocado Crema', 'Creamy, smooth avocado crema sauce', 'sides', 100, 64),
('Thunder Sauce', 'Sweet and spicy, fresh apricot habanero sauce', 'sides', 100, 65),
('Ranch', 'Smooth, creamy ranch homemade with fresh ingredients', 'sides', 100, 66);

-- ============================================================
-- Link all items to both locations
-- ============================================================
INSERT INTO location_menu_items (location_id, menu_item_id)
SELECT l.id, m.id FROM locations l CROSS JOIN menu_items m;

-- ============================================================
-- MODIFIER GROUPS
-- ============================================================

INSERT INTO modifier_groups (name, display_name, type, is_required, min_selections, max_selections, sort_order) VALUES
('combo_side', 'Choose Your Side', 'single', true, 1, 1, 1),
('combo_drink', 'Choose Your Drink', 'single', true, 1, 1, 2),
('burger_extras', 'Add Extras', 'multiple', false, 0, 5, 3),
('cheese_choice', 'Choose Your Cheese', 'single', false, 0, 1, 4),
('sauce_choice', 'Add Sauce', 'multiple', false, 0, 3, 5),
('drink_size', 'Choose Size', 'single', true, 1, 1, 6),
('shake_upgrade', 'Upgrade to Shake', 'single', false, 0, 1, 7),
('remove_toppings', 'Remove Toppings', 'multiple', false, 0, 5, 8);

-- ============================================================
-- MODIFIERS
-- ============================================================

-- Combo Side choices
INSERT INTO modifiers (group_id, name, price_adjustment, is_default, sort_order)
SELECT mg.id, m.name, m.price, m.def, m.ord
FROM modifier_groups mg
CROSS JOIN LATERAL (VALUES
    ('French Fries', 0, true, 1),
    ('Onion Rings', 200, false, 2)
) AS m(name, price, def, ord)
WHERE mg.name = 'combo_side';

-- Combo Drink choices
INSERT INTO modifiers (group_id, name, price_adjustment, is_default, sort_order)
SELECT mg.id, m.name, m.price, m.def, m.ord
FROM modifier_groups mg
CROSS JOIN LATERAL (VALUES
    ('Coke', 0, true, 1),
    ('Coke Zero', 0, false, 2),
    ('Barqs Root Beer', 0, false, 3),
    ('Peach Tea', 0, false, 4),
    ('Fruit Punch', 0, false, 5),
    ('Sprite', 0, false, 6),
    ('Cherry Coke', 0, false, 7),
    ('Fanta Strawberry', 0, false, 8)
) AS m(name, price, def, ord)
WHERE mg.name = 'combo_drink';

-- Shake upgrade (for combos)
INSERT INTO modifiers (group_id, name, price_adjustment, is_default, sort_order)
SELECT mg.id, m.name, m.price, m.def, m.ord
FROM modifier_groups mg
CROSS JOIN LATERAL (VALUES
    ('No Shake', 0, true, 1),
    ('Vanilla Shake', 200, false, 2),
    ('Chocolate Shake', 200, false, 3),
    ('Mix Shake', 200, false, 4)
) AS m(name, price, def, ord)
WHERE mg.name = 'shake_upgrade';

-- Burger extras
INSERT INTO modifiers (group_id, name, price_adjustment, is_default, sort_order)
SELECT mg.id, m.name, m.price, m.def, m.ord
FROM modifier_groups mg
CROSS JOIN LATERAL (VALUES
    ('Extra Patty', 300, false, 1),
    ('Bacon', 200, false, 2),
    ('Extra Cheese', 100, false, 3),
    ('Grilled Onions', 0, false, 4),
    ('Jalapeños', 0, false, 5)
) AS m(name, price, def, ord)
WHERE mg.name = 'burger_extras';

-- Cheese choice
INSERT INTO modifiers (group_id, name, price_adjustment, is_default, sort_order)
SELECT mg.id, m.name, m.price, m.def, m.ord
FROM modifier_groups mg
CROSS JOIN LATERAL (VALUES
    ('American', 0, true, 1),
    ('Swiss', 0, false, 2),
    ('Pepper Jack', 0, false, 3),
    ('No Cheese', 0, false, 4)
) AS m(name, price, def, ord)
WHERE mg.name = 'cheese_choice';

-- Sauce choice (for chicken strips, sides)
INSERT INTO modifiers (group_id, name, price_adjustment, is_default, sort_order)
SELECT mg.id, m.name, m.price, m.def, m.ord
FROM modifier_groups mg
CROSS JOIN LATERAL (VALUES
    ('Storm Sauce', 0, false, 1),
    ('BBQ', 0, false, 2),
    ('Honey Mustard', 0, false, 3),
    ('Spicy Mayo', 0, false, 4),
    ('Avocado Crema', 0, false, 5),
    ('Thunder Sauce', 0, false, 6),
    ('Ranch', 0, false, 7)
) AS m(name, price, def, ord)
WHERE mg.name = 'sauce_choice';

-- Drink size
INSERT INTO modifiers (group_id, name, price_adjustment, is_default, sort_order)
SELECT mg.id, m.name, m.price, m.def, m.ord
FROM modifier_groups mg
CROSS JOIN LATERAL (VALUES
    ('Regular', 0, true, 1),
    ('Large', 80, false, 2)
) AS m(name, price, def, ord)
WHERE mg.name = 'drink_size';

-- Remove toppings (for burgers)
INSERT INTO modifiers (group_id, name, price_adjustment, is_default, sort_order)
SELECT mg.id, m.name, m.price, m.def, m.ord
FROM modifier_groups mg
CROSS JOIN LATERAL (VALUES
    ('No Pickles', 0, false, 1),
    ('No Onions', 0, false, 2),
    ('No Tomato', 0, false, 3),
    ('No Lettuce', 0, false, 4),
    ('No Sauce', 0, false, 5)
) AS m(name, price, def, ord)
WHERE mg.name = 'remove_toppings';

-- ============================================================
-- LINK MODIFIER GROUPS TO MENU ITEMS
-- ============================================================

-- All combos get: side choice + drink choice + shake upgrade
INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id)
SELECT mi.id, mg.id
FROM menu_items mi CROSS JOIN modifier_groups mg
WHERE mi.category = 'combos' AND mg.name IN ('combo_side', 'combo_drink', 'shake_upgrade');

-- Burger combos also get: burger extras + cheese choice + remove toppings
INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id)
SELECT mi.id, mg.id
FROM menu_items mi CROSS JOIN modifier_groups mg
WHERE mi.category = 'combos'
  AND mi.name ILIKE '%burger%'
  AND mg.name IN ('burger_extras', 'cheese_choice', 'remove_toppings')
ON CONFLICT DO NOTHING;

-- Chicken combos also get: sauce choice
INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id)
SELECT mi.id, mg.id
FROM menu_items mi CROSS JOIN modifier_groups mg
WHERE mi.category = 'combos'
  AND (mi.name ILIKE '%chicken%')
  AND mg.name = 'sauce_choice'
ON CONFLICT DO NOTHING;

-- Individual burgers get: burger extras + cheese choice + remove toppings
INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id)
SELECT mi.id, mg.id
FROM menu_items mi CROSS JOIN modifier_groups mg
WHERE mi.category = 'burgers' AND mg.name IN ('burger_extras', 'cheese_choice', 'remove_toppings');

-- Individual chicken items get: sauce choice
INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id)
SELECT mi.id, mg.id
FROM menu_items mi CROSS JOIN modifier_groups mg
WHERE mi.category = 'chicken' AND mg.name = 'sauce_choice';

-- Drinks get: drink size
INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id)
SELECT mi.id, mg.id
FROM menu_items mi CROSS JOIN modifier_groups mg
WHERE mi.category = 'drinks' AND mg.name = 'drink_size';
