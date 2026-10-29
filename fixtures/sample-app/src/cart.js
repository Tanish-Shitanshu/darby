// Small shopping-cart helpers used by the checkout page.
function subtotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

// percent is given as a whole number: 10 means 10 %
function applyDiscount(amount, percent) {
  return amount - amount * percent;
}

function total(items, percent = 0) {
  return applyDiscount(subtotal(items), percent);
}

module.exports = { subtotal, applyDiscount, total };
