#!/bin/bash

cd /home/ubuntu/webapp
sudo nohup node server.js >> debug.log 2>&1 &