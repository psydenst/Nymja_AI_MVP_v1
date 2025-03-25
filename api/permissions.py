from rest_framework.permissions import BasePermission, SAFE_METHODS

class isNymAdmin(BasePermission):
	message = "You must be an admin to perform this action"
	
	def has_permission(self, request, view):
		if request.user.is_staff:
			return True
		return False