up:
	@docker compose up -d

down:
	@docker compose down

inside:
	@docker exec -it iris-call-async bash