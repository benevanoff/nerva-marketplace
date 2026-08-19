# User Guide

This guide walks through everything a user can do on the NERVA Marketplace.
It covers buyer accounts (browsing, cart, checkout, payment) and touches
on vendor features where relevant.

Some features are still works in progress. Those are called out below
rather than hidden, so you know what to expect.

## Accounts

### Register

1. Open the marketplace homepage and click the hamburger icon in the top
   left to open the navigation drawer.
2. Click **Login**, then click the "Need to register an account?" link
   underneath the login form.
3. Fill in a username, email, password, and confirm the password.
   The two passwords must match.
4. Click **Submit Registration**.

After submitting, your account is created in the database with a status
of `unverified`. Before you can sign in, the account needs to be
activated. The activation flow works like this: the backend generates an
activation token and stores it in the `user_validation_tokens` table.
Visiting the URL `/activate/<token>` in the browser sends a POST request
that flips the account status to `active`.

The way that activation token gets delivered to the user (email, manual
handoff, etc.) is not yet wired up. For now, if you are running the
backend yourself, you can grab the token directly from the database and
visit `/activate/<token>` in the browser.

### Login

1. Open the navigation drawer and click **Login**.
2. Enter your username and password.
3. Click **Login**.

If the credentials are correct, the backend sets a `session_id` cookie
and the page redirects you to the listings page (or back to wherever you
were trying to go before being prompted to sign in).

### Logout

The navigation drawer shows a **Logout** button when you are signed in.
Clicking it calls the backend's `/users/logout` endpoint, which deletes
your session from Redis and clears the `session_id` cookie. The page
then refreshes the user context and sends you back to the homepage, so
the UI immediately reflects the signed-out state.

## Browsing

### Listings

The homepage (`/`) and the `/listings` route both show every listing on
the marketplace as a grid of cards. Each card shows the listing image,
its title, the price in XNV, and the quantity available.

Click any card to open the listing detail page at `/listing/<listing_id>`.

### Listing detail

The detail page shows the full-size image, the title, the price badge,
and three tabs: **Product Details**, **About the Vendor**, and
**Reviews**. Only the Product Details tab has content today; the other
two are placeholders.

The product description is shown below the tabs.

## Cart

### Adding items

On a listing detail page, click **Add to cart**. If you are not signed
in, a modal pops up prompting you to log in. Clicking **Login** in the
modal takes you to the login page and remembers where you were, so you
get sent back to the listing after signing in.

If you are signed in, the backend adds the listing ID to your cart
(stored in Redis, keyed by your session) and a small "Item Added to
Cart" modal confirms it worked.

### Viewing the cart

Click the cart icon in the top right of the header to open `/cart`. The
cart page lists every item you have added, each with its image, title,
and price in XNV. Below the items there is a textarea for shipping
details and a **Checkout** button.

The **Remove** button next to each cart item is currently not wired up.
See the issue tracker.

### Checkout

1. Type your shipping address and any special instructions into the
   shipping details textarea.
2. Click **Checkout**.

The checkout flow does two things in sequence. First it sends your
shipping details to the backend, which attaches them to your cart. Then
it calls the checkout endpoint, which:

- Looks up every listing in your cart
- Computes the total XNV amount
- Asks the invoice service to create a new invoice (the invoice service
  calls the NERVA wallet RPC to generate a fresh subaddress for the
  payment)
- Creates an order record in the database
- Decrements the `quantity_available` on each purchased listing
- Clears your cart

After checkout you are redirected to the invoice page at
`/invoice/<invoice_id>`.

## Payment

The invoice page shows the amount due in XNV and the NERVA subaddress
you need to send the payment to. The address is displayed in a readonly
textarea so you can copy it.

Below the address there is a status bar with two dots. The first dot
fills in when the payment is detected in the mempool, the second when it
is confirmed on chain. The page holds a WebSocket connection to the
invoice service, so these updates happen in real time without needing
to refresh.

Underneath the status bar, the transactions list shows every transaction
the wallet has seen for this invoice, with its tx hash, amount, and
confirmation status (Pending or Confirmed).

The flow on the NERVA side works like this: when you send the XNV to the
subaddress, the nerva-wallet-rpc daemon detects the transaction and runs
`process_new_tx.py`. That script checks the amount matches the invoice,
updates the invoice status, and pushes a message into RabbitMQ. The
WebSocket server picks up the message and forwards it to your browser.
When the transaction gets a confirmation, the same thing happens again
with an updated confirmation count.

## Orders

### As a buyer

Open the navigation drawer and click **Your Orders** to see your order
history at `/customer/orders`. Each entry shows the order ID, the date
it was placed, the invoice status (pending or confirmed), and the
shipping status (pending or shipped).

### As a vendor

If your account has the `is_vendor` flag set, the navigation drawer
shows two extra buttons: **Create Listing** and **Vendor Orders**.

The Vendor Orders page at `/vendor/orders` lists every order placed
against your listings, with the order ID, date, amount in XNV, and
payment status. There is no UI yet for marking an order as shipped;
that has to be done directly in the database for now.

## Vendor: creating a listing

1. Open the navigation drawer and click **Create Listing**.
2. Fill in the title, description, price in XNV, and the quantity
   available (how many units of this item you have in stock). The
   quantity defaults to 1 and must be at least 1.
3. Choose an image file (the backend accepts jpg, jpeg, png).
4. Click **Submit**.

The listing is sent to the backend as multipart form data. While the
request is in flight the submit button is disabled and reads
"Submitting...". When the backend responds, a modal pops up with either
a success message or an error message explaining what went wrong (for
example, "File too big" or "Invalid file extension"). On success,
clicking **Continue** takes you to the listings page. On error, clicking
**Try again** dismisses the modal so you can fix the inputs and
resubmit.
