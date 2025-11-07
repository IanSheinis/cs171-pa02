# Claude generated makefiles
# Note that for autograder reasons,
# the following variable must
# be spelled exactly PORT!
PORT1 ?= 8001
PORT2 ?= 8002
PORT3 ?= 8003
PORT ?= 8004

.PHONY: compile run_clients stop clean

# Empty compile target (ts-node doesn't need compilation)
compile:

# Run all clients and master sequentially
run_clients: stop clean
	@echo "Starting clients and master..."
	ts-node p1.ts -port1 $(PORT1) -port2 $(PORT2) -port3 $(PORT3) -port $(PORT) & \
	sleep 1; \
	ts-node p2.ts -port1 $(PORT1) -port2 $(PORT2) -port3 $(PORT3) -port $(PORT) & \
	sleep 1; \
	ts-node p3.ts -port1 $(PORT1) -port2 $(PORT2) -port3 $(PORT3) -port $(PORT) & \
	sleep 2; \
	ts-node master.ts -port1 $(PORT1) -port2 $(PORT2) -port3 $(PORT3) -port $(PORT)

# Stop all running processes
stop:
	@echo "Killing processes..."
	@pkill -f "ts-node p1.ts" || true
	@pkill -f "ts-node p2.ts" || true
	@pkill -f "ts-node p3.ts" || true
	@pkill -f "ts-node master.ts" || true
	@echo "All processes stopped."

# Clean output files
clean:
	@echo "Cleaning up..."
	rm -f output.txt
	@echo "Cleanup complete."