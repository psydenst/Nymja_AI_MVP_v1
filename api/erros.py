
def print_error(error, is_exception):
	if is_exception:
		print("================================ Exception ================================")
		print(f"Exception: {error}")
		print("================================ Exception ================================")
	else:
		print(f"Error: {error}")