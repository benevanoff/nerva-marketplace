# Market Service Architecture

There are two main components of this application: a REST server and a SQL database.

The market service handles the management of users on the marketplace, management of marketplace listings, management of user carts on the marketplace including checkout, and vendor management of orders placed by customers.

The marketplace depends on the invoice service to generate payment invoices at the checkout and the determine the payment status of orders on the marketplace.

## The SQL Database

