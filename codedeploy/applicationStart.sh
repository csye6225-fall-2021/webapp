#!/bin/bash

sudo cp home/ubuntu/server/config.json home/ubuntu/webapp/
cd /home/ubuntu/webapp
sudo nohup node server.js >> debug.log 2>&1 &