'use strict';

const express = require('express');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory order store
const orders = [];
let nextId = 1;

/**
 * POST /orders
 * Body: { customerName, address, items }
 * Creates a new order and returns it.
 */
app.post('/orders', (req, res) => {
  const { customerName, address, items } = req.body;

  if (!customerName || !address || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'customerName, address, and a non-empty items array are required.' });
  }

  const order = {
    id: nextId++,
    customerName: String(customerName),
    address: String(address),
    items: items.map(String),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  orders.push(order);
  return res.status(201).json(order);
});

/**
 * GET /orders
 * Returns all orders (newest first).
 * Optional query: ?status=pending|delivered
 */
app.get('/orders', (req, res) => {
  const { status } = req.query;
  const result = status
    ? orders.filter((o) => o.status === status)
    : [...orders];
  result.sort((a, b) => b.id - a.id);
  return res.json(result);
});

/**
 * PATCH /orders/:id
 * Body: { status }
 * Updates the status of an order.
 */
app.patch('/orders/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const { status } = req.body;
  const allowed = ['pending', 'in-progress', 'delivered'];
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}.` });
  }

  order.status = status;
  return res.json(order);
});

module.exports = app;
