if [ -z  $2 ]; then userName="peteroffthestrip"; else userName=$2; fi
if [ -z $1 ]; then echo "Usage: buildDocker version [userName]";
else echo sudo docker build -f Dockerfile.fxa --tag "$userName/fxa:$1" ;
fi

