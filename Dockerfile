FROM python:3.12-slim
LABEL maintainer twtrubiks
ENV PYTHONUNBUFFERED 1
RUN mkdir /ptt_beauty_infinite_scroll
WORKDIR /ptt_beauty_infinite_scroll
COPY . /ptt_beauty_infinite_scroll/
RUN pip install -r requirements.txt

# for entry point
RUN chmod +x /ptt_beauty_infinite_scroll/entrypoint.sh

# 設定 entrypoint
ENTRYPOINT ["/ptt_beauty_infinite_scroll/entrypoint.sh"]