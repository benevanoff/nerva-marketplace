DROP DATABASE IF EXISTS `market`;
CREATE DATABASE market;
USE market;

DROP TABLE IF EXISTS `users`;
CREATE TABLE users (
    username VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    status enum('unverified', 'active', 'deactivated') DEFAULT 'unverified',
    is_vendor INT DEFAULT 0
);

DROP TABLE IF EXISTS `user_validation_tokens`;
CREATE TABLE user_validation_tokens (
    token VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS `listings`;
CREATE TABLE listings (
    listing_id INT PRIMARY KEY AUTO_INCREMENT,
    vendor VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(2048) NOT NULL,
    image_name VARCHAR(255) NOT NULL,
    price_xnv DECIMAL(20,12),
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS `orders`;
CREATE TABLE orders (
    order_id INT PRIMARY KEY AUTO_INCREMENT,
    vendor VARCHAR(255) NOT NULL,
    buyer VARCHAR(255) NOT NULL,
    invoice_id INT NOT NULL,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS `order_items`;
CREATE TABLE order_items (
    order_item_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    item_listing_id INT NOT NULL
);

DROP TABLE IF EXISTS `order_shipping`;
CREATE TABLE order_shipping (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    shipping_note TEXT NOT NULL
);