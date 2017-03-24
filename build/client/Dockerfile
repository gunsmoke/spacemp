FROM mhart/alpine-node

RUN npm install -g http-server

ADD . /code

WORKDIR /code

CMD http-server . -p 8000