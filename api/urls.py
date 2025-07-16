from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenObtainPairView
from . import views
from .views import LastBotMessageIdView
urlpatterns = [
    # Auth #
    path('auth/register/', views.CompleteRegister, name='register'),
    path('auth/login/', views.LoginNymUser, name='login'),
    path('auth/logout/', views.LogoutNymUser, name='logout'),
    path('auth/change-credentials/', views.ChangeCredentials, name='change_credentials'),
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Users Admin Management #
    path('admin/users/', views.GetAllUsers, name='list_users'),
	path('admin/conversations/', views.GetAllConversations, name='list_conversations'),

    # Conversations #
    path('conversations/', views.GetUserConversation, name='list_conversations'),
    path('conversations/create/', views.CreateConversation, name='create_conversation'),
    path('conversations/<uuid:conversation_id>/delete/', views.DeleteConversation, name='delete_conversation'),
    path('conversations/<uuid:conversation_id>/name/', views.NameConversation, name='name_conversation'),
    path('conversations/<uuid:conversation_id>/rename/', views.RenameConversation, name='rename_conversation'),
    # Messages #
    path('conversations/<uuid:conversation_id>/messages/last_bot/', LastBotMessageIdView.as_view()),
    path('conversations/<uuid:conversation_id>/messages/', views.GetConversationMessages, name='list_messages'),
    path('conversations/<uuid:conversation_id>/messages/send/', views.SaveMessage, name='send_message'),
	path('conversations/<uuid:message_id>/messages/response/', views.BotResponseView.as_view(), name='bot_response'),
    path('conversations/<uuid:message_id>/messages/cancel/', views.cancel_stream, name='cancel_stream'),
	path('messages/<uuid:message_id>/', views.CrudMessage, name='Crud_message'),
]
