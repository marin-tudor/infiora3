from django.urls import path
from . import views

urlpatterns = [
    # Authentication endpoints
    path('login/', views.LoginView.as_view(), name='login'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('refresh-token/', views.RefreshTokenView.as_view(), name='refresh_token'),
    
    # Password management
    path('forgot-password/', views.ForgotPasswordView.as_view(), name='forgot_password'),
    path('reset-password/', views.ResetPasswordView.as_view(), name='reset_password'),
    
    # Profile management
    path('me/', views.MeView.as_view(), name='me'),
    path('update-me/', views.UpdateMeView.as_view(), name='update_me'),
    
    # Account management
    path('delete-account/', views.DeleteAccountView.as_view(), name='delete_account'),
    path('deactivate-account/', views.DeactivateAccountView.as_view(), name='deactivate_account'),
    
    # Email verification
    path('send-verification-email/', views.SendVerificationEmailView.as_view(), name='send_verification_email'),
    path('verify-email/', views.VerifyEmailView.as_view(), name='verify_email'),
]