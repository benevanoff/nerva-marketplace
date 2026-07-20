# Invoice Microservices Architecture

## User Story

I

# How it works

1. An invoice is created via a POST request to the `/invoice/create` endpoint. This creates a new invoice record in the SQL database which records the time at which the invoice was created, the amount owed (in atomic units), the wallet subaddress that should be used for receiving the invoice payment, as well as the status (pending/confirmed) and an auto incrementing invoice id.

2. When a transaction destined for the service wallet is detected in the network transaction mempool by the nerva-wallet-rpc server, a new process will be spawned to execute an instance of the `process_new_tx.py` program with the newly detected transaction hash as the only program argument. The `process_new_tx.py` program should lookup the transaction, check that the transaction amount is equal to or greater than the invoice amount, update the invoice record in the SQL database to `mempool` and then push a new message containing that transaction hash into a RabbitMQ message queue.

3. A websocket server listens for messages from the RabbitMQ message queue and forwards them to clients to notify the client that we have detected their payment in the mempool.

4. When a transaction is confirmed to have been included in the blockchain, the `process_new_tx.py` program will again be executed. This time it should update the invoice record's status to `confirmed` and again push a message to the RabbitMQ queue.

5. The websocket server should pop the message and send a final notification to the client that we have validated that the payment was confirmed.