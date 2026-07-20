DROP DATABASE IF EXISTS `invoices_db`;
CREATE DATABASE invoices_db;
USE invoices_db;

DROP TABLE IF EXISTS `invoices`;
CREATE TABLE invoices (
    invoice_id INT PRIMARY KEY AUTO_INCREMENT,
    amount DECIMAL(20,12) NOT NULL,
    address VARCHAR(105) NOT NULL,
    status enum('pending', 'confirmed') DEFAULT 'pending',
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);