'use strict';

const request = require('supertest');

// Each test file gets a fresh instance of the app (no shared state between files).
// We re-require server.js so the in-memory store starts empty for every test run.
let app;

beforeEach(() => {
  // Clear module cache so each test starts with a fresh in-memory order store.
  jest.resetModules();
  app = require('../server');
});

describe('POST /orders', () => {
  it('creates an order and returns 201 with the order object', async () => {
    const res = await request(app)
      .post('/orders')
      .send({ customerName: 'Alice', address: '1 Main St', items: ['Burger', 'Fries'] });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: expect.any(Number),
      customerName: 'Alice',
      address: '1 Main St',
      items: ['Burger', 'Fries'],
      status: 'pending',
      createdAt: expect.any(String),
    });
  });

  it('returns 400 when customerName is missing', async () => {
    const res = await request(app)
      .post('/orders')
      .send({ address: '1 Main St', items: ['Burger'] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 400 when address is missing', async () => {
    const res = await request(app)
      .post('/orders')
      .send({ customerName: 'Bob', items: ['Pizza'] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 400 when items is empty', async () => {
    const res = await request(app)
      .post('/orders')
      .send({ customerName: 'Carol', address: '2 Oak Ave', items: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 400 when items is not an array', async () => {
    const res = await request(app)
      .post('/orders')
      .send({ customerName: 'Dave', address: '3 Pine Rd', items: 'Burger' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });
});

describe('GET /orders', () => {
  it('returns an empty array when no orders exist', async () => {
    const res = await request(app).get('/orders');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all orders sorted newest first', async () => {
    await request(app).post('/orders').send({ customerName: 'Alice', address: '1 Main St', items: ['Burger'] });
    await request(app).post('/orders').send({ customerName: 'Bob',   address: '2 Oak Ave',  items: ['Pizza'] });

    const res = await request(app).get('/orders');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].customerName).toBe('Bob');   // newest first
    expect(res.body[1].customerName).toBe('Alice');
  });

  it('filters by status when ?status= is provided', async () => {
    await request(app).post('/orders').send({ customerName: 'Alice', address: '1 Main St', items: ['Burger'] });

    const allOrders = await request(app).get('/orders');
    const orderId = allOrders.body[0].id;

    // Mark the order as delivered
    await request(app).patch(`/orders/${orderId}`).send({ status: 'delivered' });

    const pending = await request(app).get('/orders?status=pending');
    expect(pending.body).toHaveLength(0);

    const delivered = await request(app).get('/orders?status=delivered');
    expect(delivered.body).toHaveLength(1);
    expect(delivered.body[0].status).toBe('delivered');
  });
});

describe('PATCH /orders/:id', () => {
  it('updates the status of an existing order', async () => {
    const create = await request(app)
      .post('/orders')
      .send({ customerName: 'Eve', address: '5 Elm St', items: ['Salad'] });

    const id = create.body.id;

    const res = await request(app)
      .patch(`/orders/${id}`)
      .send({ status: 'in-progress' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in-progress');
  });

  it('returns 404 for a non-existent order id', async () => {
    const res = await request(app)
      .patch('/orders/9999')
      .send({ status: 'delivered' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 400 for an invalid status value', async () => {
    const create = await request(app)
      .post('/orders')
      .send({ customerName: 'Frank', address: '6 Birch Ln', items: ['Wings'] });

    const id = create.body.id;

    const res = await request(app)
      .patch(`/orders/${id}`)
      .send({ status: 'cancelled' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });
});
