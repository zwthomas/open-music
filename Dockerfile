FROM node:16

WORKDIR /usr/src/app

RUN git clone https://github.com/zwthomas/Open-Voice.git .
RUN npm install


CMD ["node", "index.js"]
