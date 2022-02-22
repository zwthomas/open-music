FROM node:16

WORKDIR /usr/src/app

RUN git clone https://github.com/zwthomas/open-music.git .
RUN npm install


CMD ["node", "index.js"]
