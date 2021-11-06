#!/bin/bash

sudo cp server/config.json webapp/
cd /home/ubuntu/webapp
sudo nohup node server.js >> debug.log 2>&1 &