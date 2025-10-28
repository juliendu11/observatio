#!/bin/sh
set -e

echo "Waiting for MariaDB to be ready..."
until nc -z mariadb 3306; do
  echo "MariaDB is unavailable - sleeping"
  sleep 2
done
echo "MariaDB is up and running!"

case "$APP_TYPE" in
  web)
    sleep 5
    echo "Running database migrations..."
    node ace migration:run --force

    echo "Running database seeders..."
    node ace db:seed --files "./database/seeders/init_seeder.ts"

    echo "Starting web server..."
    exec node ./bin/server.js
    ;;
 recorder)
    echo "Starting scheduler..."
    exec node ace recording:start
    ;;
 job)
    echo "Starting job queue worker..."
    exec node ace queue:listen
    ;;
  *)
    echo "Unknown APP_TYPE: $APP_TYPE"
    exit 1
    ;;
esac
