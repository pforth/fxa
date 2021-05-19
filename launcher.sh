#!/bin/bash
now=$(date)
echo "Starting container: $now"
if [ ! $server  ]
then
  echo "No server specificed, running Bash..."
  bash
else 
  echo "Running $server"
  cd packages
  if [ $server = "fxa-payments-server" ]
  then
    cd fxa-payments-server
    node server/bin/fxa-payments-server.js
  elif [ $server = "fxa-profile-server" ]
  then
    cd fxa-profile-server
    node bin/server.js
  elif [ $server = "fxa-profile-server-worker" ]
  then
    cd fxa-profile-server
    node bin/worker.js
  elif [ $server = "fxa-profile-server-static" ]
  then
    cd fxa-profile-server
    node bin/_static.js
  elif [ $server = "fxa-graphql-api" ]
  then
    cd fxa-graphql-api
#    debugging? nest start --debug=9200 --watch
    nest start
  elif [ $server = "fxa-content-server" ]
  then
    cd fxa-content-server
#  debugging?   node --inspect=9130 server/bin/fxa-content-server.js
    node scripts/check-local-config
    grunt l10n-create-json l10n-generate-tos-pp:app
    node server/bin/fxa-content-server.js
  elif [ $server = "fxa-customs-server" ]
  then
    cd fxa-customs-server
    node bin/customs_server.js
  elif [ $server = "fxa-event-broker" ]
  then
    cd fxa-event-broker
    #nest start --debug=9180 --watch
    nest start
  elif [ $server = "fxa-auth-server" ]
  then
    cd fxa-auth-server
    node -r ts-node/register bin/key_server.js
  elif [ $server = "fxa-auth-db-mysql" ]
  then
    cd fxa-auth-db-mysql
    node bin/db_patcher.js
    node bin/server.js
  elif [ $server = "fortress" ]
  then
    cd fortress
    node server.js
  elif [ $server = "browserid-verifier" ]
  then
    cd browserid-verifier
    node server.js
  elif [ $server = "123done" ]
  then
    cd 123done
    node server.js
  elif [ $server = "321done" ]
  then
    cd 123done
    node server.js
  elif [ $server = "debug" ]
  then
    # Sleep forever to keep the container/pod alive so you can exec -it into it
    sleep 1000000000000
  else
    echo "Unknown server $server"
    bash
  fi
fi
now=$(date)
echo "Closing container: $now"

