#!/usr/bin/env bash

# Run from the docker/ parent dir.

set -e # exit on any error.
set -x

version="`cat version.txt | sed s/WIP/SNAPSHOT/`"

rm -fr target/docker-app-prod
cp -a docker/app-prod target/docker-app-prod
cd target/docker-app-prod
cp ../universal/effectivediscussions-$version.zip ./
unzip -q effectivediscussions-$version.zip
mv effectivediscussions-$version app

# ( &> redirects both stderr and stdout.)
mkdir build-info
date --utc --iso-8601=seconds > build-info/docker-image-build-date.txt
git rev-parse HEAD &> build-info/git-revision.txt
git log --oneline -n100 &> build-info/git-log-oneline.txt
git status &> build-info/git-status.txt
git diff &> build-info/git-diff.txt
git describe --tags &> build-info/git-describe-tags.txt
# This fails if there is no tag, so disable exit-on-error.
set +e
git describe --exact-match --tags &> build-info/git-describe-exact-tags.txt
set -e

# Move our own JARs do a separate folder, so they can be copied in a separate Dockerfile
# COPY step, so that when pushing/pulling to/from Docker Hub, only the very last COPY will
# usually have to be pushed (and pulled by others).
mkdir app-lib-debiki
mv app/lib/*debiki* app-lib-debiki/
mv app/lib/*effectivediscussions* app-lib-debiki/
mv app/bin app-bin
mv app/conf app-conf

# This readme is for the development repo. Create another one, if any, for prod.
rm app/README.md

sudo docker build --tag=debiki/ed-app:latest .

echo "Image tag: debiki/ed-app:latest"
