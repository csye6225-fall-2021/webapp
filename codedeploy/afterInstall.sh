#!/bin/bash
pwd
ls -lrt
sudo unzip build_artifact.zip
echo "#CSYE6225: doing after install: remove zip from webapp folder"
pwd
ls -lrt
cd ..
sudo cp /home/ubuntu/webapp/cloudwatch-config.json /opt/aws/amazon-cloudwatch-agent/etc/
x
sleep 3
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -c file:/opt/cloudwatch-config.json \
    -s
