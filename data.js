/* Food Poker — the starting deck.
   Everything here is just a seed; the app copies it into localStorage on first
   run and the Bank tab is the source of truth after that.

   effort      1 (open a box) .. 5 (an evening's project)
   indulgence  1 (virtuous)   .. 5 (full send)
   health      0..100, shown as the bar on the back of the card
   chips       2-3 short notes, no more — the card should stay readable
   notable     things you probably DON'T have on hand -> the shopping list  */

const SEED_MEALS = [
  // --- comfort bench -------------------------------------------------------
  { name: 'Broccoli Chicken Casserole', effort: 2, indulgence: 4, health: 45, rating: 4,
    chips: ['High protein', 'Cheesy'],
    notable: ['Cream of chicken soup', 'Sharp cheddar', 'Ritz crackers', 'Broccoli crowns'] },

  { name: 'Poppy Seed Chicken', effort: 2, indulgence: 5, health: 35, rating: 4,
    chips: ['High protein', 'Buttery'],
    notable: ['Poppy seeds', 'Sour cream', 'Cream of chicken soup', 'Ritz crackers'] },

  { name: 'Butter Chicken', effort: 3, indulgence: 4, health: 55, rating: 5,
    chips: ['High protein', 'Creamy', 'Spiced'],
    notable: ['Garam masala', 'Heavy cream', 'Tomato paste', 'Fresh ginger', 'Basmati rice', 'Naan'] },

  { name: 'Pizza', effort: 2, indulgence: 5, health: 35, rating: 5,
    chips: ['Carb-heavy', 'Cheesy'],
    notable: ['Pizza dough', 'Fresh mozzarella', 'Pizza sauce', 'Pepperoni'] },

  { name: 'Spaghetti Bolognese', effort: 2, indulgence: 3, health: 55, rating: 5,
    chips: ['High protein', 'Carb-heavy'],
    notable: ['Ground beef', 'San Marzano tomatoes', 'Tomato paste', 'Parmesan wedge', 'Red wine'] },

  { name: 'Spaghetti Alfredo', effort: 2, indulgence: 5, health: 30, rating: 4,
    chips: ['Creamy', 'Carb-heavy'],
    notable: ['Heavy cream', 'Parmesan wedge', 'Fettuccine', 'Fresh parsley'] },

  { name: 'Meatloaf', effort: 3, indulgence: 4, health: 45, rating: 4,
    chips: ['High protein', 'Classic'],
    notable: ['Ground beef', 'Panko', 'Ketchup', 'Brown sugar', 'Worcestershire'] },

  { name: 'Sloppy Joes', effort: 2, indulgence: 4, health: 40, rating: 4,
    chips: ['High protein', 'Saucy'],
    notable: ['Ground beef', 'Brioche buns', 'Tomato paste', 'Worcestershire'] },

  { name: 'Mac-n-Cheese', effort: 1, indulgence: 5, health: 25, rating: 5,
    chips: ['Cheesy', 'Carb-heavy'],
    notable: ['Elbow pasta', 'Sharp cheddar', 'Evaporated milk', 'Dry mustard'] },

  { name: 'Grilled Cheese', effort: 1, indulgence: 4, health: 30, rating: 4,
    chips: ['Cheesy', '15 minutes flat'],
    notable: ['Sourdough loaf', 'Gruyère or American', 'Good butter'] },

  { name: 'Tuna and Rice', effort: 1, indulgence: 2, health: 60, rating: 3,
    chips: ['Lean protein', 'Pantry meal'],
    notable: ['Canned tuna', 'Jasmine rice', 'Furikake', 'Frozen peas'] },

  // --- the wholesome rotation ---------------------------------------------
  { name: 'Curry', effort: 3, indulgence: 2, health: 70, rating: 5,
    chips: ['Veg-forward', 'Spiced'],
    notable: ['Curry paste', 'Coconut milk', 'Fresh ginger', 'Cilantro', 'Basmati rice'] },

  { name: 'Quinoa Bowls', effort: 2, indulgence: 1, health: 90, rating: 4,
    chips: ['Veg-forward', 'High fiber', 'Lean'],
    notable: ['Quinoa', 'Feta', 'Chickpeas', 'Cucumber', 'Tahini', 'Lemons'] },

  { name: 'Roast Chicken + Veg', effort: 3, indulgence: 2, health: 80, rating: 5,
    chips: ['High protein', 'Veg-forward'],
    notable: ['Whole chicken', 'Carrots', 'Baby potatoes', 'Fresh thyme', 'Lemons'] },

  { name: 'Roast Fish + Veg', effort: 2, indulgence: 1, health: 88, rating: 4,
    chips: ['Lean protein', 'Veg-forward'],
    notable: ['White fish fillets', 'Asparagus', 'Capers', 'Lemons'] },

  { name: 'Squash Kale Soup', effort: 3, indulgence: 1, health: 92, rating: 4,
    chips: ['Veg-forward', 'High fiber'],
    notable: ['Butternut squash', 'Lacinato kale', 'Vegetable stock', 'Coconut milk', 'Fresh sage'] },

  { name: 'Tomato Soup', effort: 2, indulgence: 2, health: 70, rating: 4,
    chips: ['Veg-forward', 'Cozy'],
    notable: ['San Marzano tomatoes', 'Heavy cream', 'Fresh basil', 'Crusty bread'] },

  { name: 'Chicken Tacos', effort: 2, indulgence: 3, health: 65, rating: 5,
    chips: ['High protein', 'Veg-forward'],
    notable: ['Corn tortillas', 'Chipotles in adobo', 'Cotija', 'Limes', 'Cilantro', 'Cabbage'] },

  { name: 'Fish Tacos', effort: 3, indulgence: 3, health: 70, rating: 5,
    chips: ['Lean protein', 'Veg-forward'],
    notable: ['White fish', 'Corn tortillas', 'Cabbage', 'Limes', 'Crema', 'Chipotles in adobo'] },

  { name: 'Turkey Meatloaf', effort: 3, indulgence: 2, health: 72, rating: 4,
    chips: ['Lean protein'],
    notable: ['Ground turkey', 'Panko', 'Ketchup', 'Yellow onion'] },

  { name: 'Turkey Meatballs', effort: 3, indulgence: 2, health: 74, rating: 4,
    chips: ['Lean protein'],
    notable: ['Ground turkey', 'Breadcrumbs', 'Parmesan', 'Marinara', 'Fresh basil'] },

  { name: 'Turkey Burgers', effort: 2, indulgence: 3, health: 65, rating: 4,
    chips: ['Lean protein'],
    notable: ['Ground turkey', 'Burger buns', 'Avocado', 'Sharp cheddar', 'Pickles'] },

  // --- date night ----------------------------------------------------------
  { name: 'Sushi Dumps', effort: 5, indulgence: 3, health: 70, rating: 5, dateNight: true,
    chips: ['Lean protein', 'Interactive'],
    notable: ['Sashimi-grade salmon', 'Sashimi-grade tuna', 'Sushi rice', 'Nori', 'Rice vinegar',
              'Avocado', 'Tobiko', 'Wasabi', 'Pickled ginger', 'Persian cucumber'] },

  { name: 'Fancy Ramen', effort: 5, indulgence: 4, health: 55, rating: 5, dateNight: true,
    chips: ['Rich broth', 'Interactive'],
    notable: ['Fresh ramen noodles', 'Pork belly', 'White miso paste', 'Scallions', 'Nori',
              'Soft-boil eggs', 'Chili crisp'] }
];
