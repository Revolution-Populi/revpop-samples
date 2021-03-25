FROM public.ecr.aws/revpop/revpop-core:latest
MAINTAINER The Revolution Populi Project

# rpc service:
EXPOSE 8090
# p2p service:
EXPOSE 2771

# default exec/config files
ADD docker/default_config.ini /etc/revpop/config.ini
ADD docker/default_logging.ini /etc/revpop/logging.ini
ADD docker/my-genesis.json /etc/revpop/genesis.json
ADD docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod a+x /usr/local/bin/entrypoint.sh

# Make Docker send SIGINT instead of SIGTERM to the daemon
STOPSIGNAL SIGINT

# default execute entry
CMD ["/usr/local/bin/entrypoint.sh"]
