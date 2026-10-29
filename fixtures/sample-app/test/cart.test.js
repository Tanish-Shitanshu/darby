const test = require('node:test');
const assert = require('node:assert/strict');
const { subtotal, applyDiscount, total } = require('../src/cart');

test('subtotal adds price times quantity', () => {
  assert.equal(subtotal([{ price: 20, qty: 2 }, { price: 5, qty: 1 }]), 45);
});

test('applyDiscount takes a whole-number percentage off', () => {
  assert.equal(applyDiscount(100, 25), 75);
});

test('total applies the discount to the subtotal', () => {
  assert.equal(total([{ price: 20, qty: 2 }], 10), 36);
});
