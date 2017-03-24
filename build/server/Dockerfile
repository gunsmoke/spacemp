FROM mhart/alpine-node

RUN npm install socket.io
RUN npm install box2dweb

RUN apk update
RUN apk add git

RUN git clone https://github.com/priologic/easyrtc.git

WORKDIR /easyrtc

RUN npm install

ADD . /code

WORKDIR /code

CMD node app.js