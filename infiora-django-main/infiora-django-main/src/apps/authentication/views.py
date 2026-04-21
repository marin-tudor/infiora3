from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from apps.users.serializers import UserSerializer
from apps.users.models import User
from apps.common.emails import AuthEmailService
from apps.common.logging import auth_logger, security_logger
from .serializers import (
    LoginSerializer,
    RegisterSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    RefreshTokenSerializer,
    UpdateProfileSerializer,
    DeleteAccountSerializer,
    DeactivateAccountSerializer,
    EmailVerificationSerializer,
    VerifyEmailTokenSerializer
)
from .schemas import (
    LOGIN_SCHEMA,
    REGISTER_SCHEMA,
    LOGOUT_SCHEMA,
    REFRESH_TOKEN_SCHEMA,
    ME_SCHEMA,
    UPDATE_ME_SCHEMA,
    DELETE_ACCOUNT_SCHEMA,
    DEACTIVATE_ACCOUNT_SCHEMA,
    FORGOT_PASSWORD_SCHEMA,
    RESET_PASSWORD_SCHEMA,
    SEND_VERIFICATION_EMAIL_SCHEMA,
    VERIFY_EMAIL_SCHEMA
)


class LoginView(APIView):
    """User login endpoint"""
    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer

    @LOGIN_SCHEMA
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            
            # Log successful login
            auth_logger.user_action(
                user_id=str(user.id),
                action='login_success',
                email=user.email,
                ip=request.META.get('REMOTE_ADDR'),
            )
            
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        
        # Log failed login attempt
        email = request.data.get('email', 'unknown')
        security_logger.security_event(
            'login_failed',
            email=email,
            ip=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            errors=serializer.errors,
        )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegisterView(APIView):
    """User registration endpoint"""
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    @REGISTER_SCHEMA
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                refresh = RefreshToken.for_user(user)
                
                # Log successful registration
                auth_logger.user_action(
                    user_id=str(user.id),
                    action='registration_success',
                    email=user.email,
                    ip=request.META.get('REMOTE_ADDR'),
                )
                
                # Send welcome email (non-blocking)
                try:
                    AuthEmailService.send_welcome_email(user)
                    auth_logger.info("Welcome email sent", user_id=str(user.id), email=user.email)
                except Exception as e:
                    # Log email error but don't fail registration
                    auth_logger.error(
                        "Failed to send welcome email",
                        user_id=str(user.id),
                        email=user.email,
                        error=str(e),
                    )
                
                return Response({
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                    'user': UserSerializer(user).data,
                    'message': 'User registered successfully'
                }, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                return Response({
                    'error': 'Registration failed. Please try again.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """User logout endpoint - blacklists the refresh token"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = RefreshTokenSerializer

    @LOGOUT_SCHEMA
    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return Response({
                    'error': 'Refresh token is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            return Response({
                'message': 'Logged out successfully'
            }, status=status.HTTP_200_OK)
        
        except TokenError:
            return Response({
                'error': 'Invalid token'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'error': 'An error occurred while logging out'
            }, status=status.HTTP_400_BAD_REQUEST)


class RefreshTokenView(APIView):
    """Custom token refresh endpoint"""
    permission_classes = [permissions.AllowAny]
    serializer_class = RefreshTokenSerializer

    @REFRESH_TOKEN_SCHEMA
    def post(self, request):
        serializer = RefreshTokenSerializer(data=request.data)
        if serializer.is_valid():
            try:
                refresh_token = RefreshToken(serializer.validated_data['refresh'])
                return Response({
                    'access': str(refresh_token.access_token),
                    'refresh': str(refresh_token)
                }, status=status.HTTP_200_OK)
            except TokenError:
                return Response({
                    'error': 'Invalid or expired refresh token'
                }, status=status.HTTP_401_UNAUTHORIZED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ForgotPasswordView(APIView):
    """Forgot password endpoint - sends reset email"""
    permission_classes = [permissions.AllowAny]
    serializer_class = ForgotPasswordSerializer

    @FORGOT_PASSWORD_SCHEMA
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            
            # Check if user exists and send reset email
            try:
                user = User.objects.get(email=email, is_active=True)
                try:
                    AuthEmailService.send_password_reset_email(user)
                except Exception as e:
                    # Log email error but don't reveal it to user
                    auth_logger.error(
                        "Failed to send password reset email",
                        email=email,
                        error=str(e),
                    )
                    
            except User.DoesNotExist:
                pass  # Don't reveal if user doesn't exist
            
            return Response({
                'message': 'If an account with that email exists, a password reset email has been sent.'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ResetPasswordView(APIView):
    """Reset password endpoint - confirms password reset"""
    permission_classes = [permissions.AllowAny]
    serializer_class = ResetPasswordSerializer

    @RESET_PASSWORD_SCHEMA
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            token = serializer.validated_data['token']
            uid = serializer.validated_data['uid']
            new_password = serializer.validated_data['new_password']
            
            try:
                user_id = force_str(urlsafe_base64_decode(uid))
                user = User.objects.get(pk=user_id)
                
                if default_token_generator.check_token(user, token):
                    user.set_password(new_password)
                    user.save()
                    return Response({
                        'message': 'Password has been reset successfully.'
                    }, status=status.HTTP_200_OK)
                else:
                    return Response({
                        'error': 'Invalid or expired token.'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except (User.DoesNotExist, ValueError, TypeError):
                return Response({
                    'error': 'Invalid reset link.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MeView(APIView):
    """Get current user profile endpoint"""
    permission_classes = [permissions.IsAuthenticated]

    @ME_SCHEMA
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class UpdateMeView(APIView):
    """Update current user profile endpoint"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UpdateProfileSerializer

    @UPDATE_ME_SCHEMA
    def patch(self, request):
        serializer = UpdateProfileSerializer(
            request.user, 
            data=request.data, 
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            user_serializer = UserSerializer(request.user)
            return Response(user_serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DeleteAccountView(APIView):
    """Delete user account endpoint"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DeleteAccountSerializer

    @DELETE_ACCOUNT_SCHEMA
    def delete(self, request):
        serializer = DeleteAccountSerializer(
            data=request.data, 
            context={'request': request}
        )
        if serializer.is_valid():
            # Permanently delete the user account
            user = request.user
            user.delete()
            
            return Response({
                'message': 'Your account has been permanently deleted.'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DeactivateAccountView(APIView):
    """Deactivate user account endpoint"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DeactivateAccountSerializer

    @DEACTIVATE_ACCOUNT_SCHEMA
    def patch(self, request):
        password = request.data.get('password')
        
        if not password:
            return Response({
                'error': 'Password is required to deactivate account.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not request.user.check_password(password):
            return Response({
                'error': 'Invalid password.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Deactivate the user account
        request.user.is_active = False
        request.user.save()
        
        # Send deactivation confirmation email
        AuthEmailService.send_account_deactivation_email(request.user)
        
        return Response({
            'message': 'Your account has been deactivated.'
        }, status=status.HTTP_200_OK)


class SendVerificationEmailView(APIView):
    """Send email verification endpoint"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = EmailVerificationSerializer

    @SEND_VERIFICATION_EMAIL_SCHEMA
    def post(self, request):
        serializer = EmailVerificationSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data.get('email', request.user.email)
            
            # Send verification email
            AuthEmailService.send_email_verification(request.user)
            
            return Response({
                'message': 'Verification email has been sent.'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyEmailView(APIView):
    """Verify email endpoint"""
    permission_classes = [permissions.AllowAny]
    serializer_class = VerifyEmailTokenSerializer

    @VERIFY_EMAIL_SCHEMA
    def post(self, request):
        serializer = VerifyEmailTokenSerializer(data=request.data)
        if serializer.is_valid():
            token = serializer.validated_data['token']
            uid = serializer.validated_data['uid']
            
            try:
                user_id = force_str(urlsafe_base64_decode(uid))
                user = User.objects.get(pk=user_id)
                
                if default_token_generator.check_token(user, token):
                    user.is_verified = True
                    user.save()
                    return Response({
                        'message': 'Email has been verified successfully.'
                    }, status=status.HTTP_200_OK)
                else:
                    return Response({
                        'error': 'Invalid or expired verification token.'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except (User.DoesNotExist, ValueError, TypeError):
                return Response({
                    'error': 'Invalid verification link.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)