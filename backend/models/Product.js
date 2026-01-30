const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String },
    category: { type: String },
    rating: { type: Number, default: 0 },
    sales: { type: Number, default: 0 }
});

module.exports = mongoose.model('Product', productSchema);
