FROM nginx:latest
COPY . /usr/share/nginx/html:ro
EXPOSE 80
