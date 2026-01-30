const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional if guest checkout
    studentName: { type: String },
    items: [
        {
            foodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            name: { type: String }, // Snapshot of product name
            quantity: { type: Number, required: true },
            price: { type: Number, required: true }
        }
    ],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'preparing', 'ready', 'completed', 'cancelled'], default: 'pending' },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
