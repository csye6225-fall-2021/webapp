#!/bin/bash

sudo rm /home/ubuntu/webapp/config.json
sudo cp /home/ubuntu/server/config.json /home/ubuntu/webapp/
cd /home/ubuntu/webapp
sudo nohup node server.js >> debug.log 2>&1 &