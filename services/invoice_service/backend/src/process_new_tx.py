import sys
import time
import pika
import asyncio
import pymysql

db_config = {
    "host": "db_invoice",
    "user": "root",
    "password": "kkfkffspassss",
    "db": "invoices_db",
    "autocommit": True
}

from nerva.wallet_rpc import WalletRPC

QUEUE_NAME = 'tx_notifications'

def push_to_rabbit_mq(message:str):
    connection_params = pika.ConnectionParameters(host='rabbitmq', port=5672, credentials=pika.PlainCredentials('user', 'passwordkkjhgq')) # for docker
    connection = pika.BlockingConnection(connection_params)
    channel = connection.channel()
    channel.queue_declare(queue=QUEUE_NAME)

    channel.basic_publish(exchange='', routing_key=QUEUE_NAME, body=message)

async def verify_tx(tx_id:str):
    # todo: it's not sustainable to search through the whole tx history each time - figure out how to query the wallet server by txid
    with pymysql.connect(**db_config) as sql_client:
            with sql_client.cursor(pymysql.cursors.DictCursor) as cur:
                cur.execute("SELECT COUNT(*) FROM invoices")
                address_count = int(cur.fetchone()["COUNT(*)"])+1
    
    wallet = WalletRPC(host="127.0.0.1", port=28082) # localhost because this runs on the same host as the rpc server
    all_txs = await wallet.incoming_transfers(transfer_type="all", account_index=0, subaddr_indices=list(range(address_count)), verbose=True)
    print("all_txs", all_txs)
    txs_found = []
    for tx in all_txs['result']['transfers']:
        if tx['tx_hash'] == tx_id:
            txs_found.append((tx))

    if len(txs_found) == 1:
        recipient_address = (await wallet.get_address(account_index=0))['result']['addresses'][txs_found[0]['subaddr_index']['minor']]['address']
        print("recipient_address", recipient_address)
        with pymysql.connect(**db_config) as sql_client:
            with sql_client.cursor(pymysql.cursors.DictCursor) as cur:
                cur.execute("SELECT * FROM invoices WHERE address = %s", (recipient_address))
                tx_invoice_rows = cur.fetchall()
                if not tx_invoice_rows:
                    return None, None
                print(tx_invoice_rows, txs_found[0]['amount'])
                if txs_found[0]['amount'] >= tx_invoice_rows[0]['amount']:
                    return float(txs_found[0]['amount']), 1
                else:
                    print(f'tx amount {txs_found[0]["amount"]} < invoice amount {tx_invoice_rows[0]["amount"]}')
    return None, None

async def main():
    await asyncio.sleep(2)
    message = sys.argv[1]
    print("process_new_tx", message)
    tx_amount, confirmations = await verify_tx(message)
    confirmations = confirmations if confirmations else 0
    if tx_amount:
        push_to_rabbit_mq(f'{message},{tx_amount},{confirmations}')
        print(f"Sent '{message},{tx_amount},{confirmations}'")

if __name__ == "__main__":
    asyncio.run(main())