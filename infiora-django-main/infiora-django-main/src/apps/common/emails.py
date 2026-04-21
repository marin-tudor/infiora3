"""
Reusable email module for sending various types of emails
"""
import logging
from typing import Optional, Dict, Any, List
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes

logger = logging.getLogger(__name__)


class EmailService:
    """Service class for handling email operations"""
    
    DEFAULT_FROM_EMAIL = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@infiora.com')
    
    @staticmethod
    def send_email(
        subject: str,
        message: str,
        recipient_list: List[str],
        from_email: Optional[str] = None,
        html_message: Optional[str] = None,
        fail_silently: bool = False
    ) -> bool:
        """
        Send a basic email
        
        Args:
            subject: Email subject
            message: Plain text message
            recipient_list: List of recipient email addresses
            from_email: Sender email (optional)
            html_message: HTML version of the message (optional)
            fail_silently: Whether to fail silently on errors
            
        Returns:
            bool: True if email was sent successfully
        """
        try:
            from_email = from_email or EmailService.DEFAULT_FROM_EMAIL
            
            if html_message:
                email = EmailMultiAlternatives(
                    subject=subject,
                    body=message,
                    from_email=from_email,
                    to=recipient_list
                )
                email.attach_alternative(html_message, "text/html")
                email.send(fail_silently=fail_silently)
            else:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=from_email,
                    recipient_list=recipient_list,
                    fail_silently=fail_silently
                )
            
            logger.info(f"Email sent successfully to {recipient_list}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {recipient_list}: {str(e)}")
            if not fail_silently:
                raise
            return False
    
    @staticmethod
    def send_template_email(
        template_name: str,
        context: Dict[str, Any],
        subject: str,
        recipient_list: List[str],
        from_email: Optional[str] = None,
        fail_silently: bool = False
    ) -> bool:
        """
        Send email using Django templates
        
        Args:
            template_name: Name of the template (without .html extension)
            context: Template context variables
            subject: Email subject
            recipient_list: List of recipient email addresses
            from_email: Sender email (optional)
            fail_silently: Whether to fail silently on errors
            
        Returns:
            bool: True if email was sent successfully
        """
        try:
            # Render HTML template
            html_message = render_to_string(f'emails/{template_name}.html', context)
            
            # Create plain text version
            plain_message = strip_tags(html_message)
            
            return EmailService.send_email(
                subject=subject,
                message=plain_message,
                recipient_list=recipient_list,
                from_email=from_email,
                html_message=html_message,
                fail_silently=fail_silently
            )
            
        except Exception as e:
            logger.error(f"Failed to send template email {template_name} to {recipient_list}: {str(e)}")
            if not fail_silently:
                raise
            return False


class AuthEmailService(EmailService):
    """Service class specifically for authentication-related emails"""
    
    @classmethod
    def send_password_reset_email(
        cls,
        user,
        domain: str = 'localhost:8000',
        use_https: bool = False,
        fail_silently: bool = True
    ) -> bool:
        """
        Send password reset email to user
        
        Args:
            user: User instance
            domain: Domain name for the reset link
            use_https: Whether to use HTTPS in the reset link
            fail_silently: Whether to fail silently on errors
            
        Returns:
            bool: True if email was sent successfully
        """
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        protocol = 'https' if use_https else 'http'
        reset_url = f"{protocol}://{domain}/auth/reset-password/{uid}/{token}/"
        
        context = {
            'user': user,
            'reset_url': reset_url,
            'domain': domain,
            'protocol': protocol,
            'uid': uid,
            'token': token
        }
        
        return cls.send_template_email(
            template_name='password_reset',
            context=context,
            subject='Password Reset Request',
            recipient_list=[user.email],
            fail_silently=fail_silently
        )
    
    @classmethod
    def send_email_verification(
        cls,
        user,
        domain: str = 'localhost:8000',
        use_https: bool = False,
        fail_silently: bool = True
    ) -> bool:
        """
        Send email verification to user
        
        Args:
            user: User instance
            domain: Domain name for the verification link
            use_https: Whether to use HTTPS in the verification link
            fail_silently: Whether to fail silently on errors
            
        Returns:
            bool: True if email was sent successfully
        """
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        protocol = 'https' if use_https else 'http'
        verification_url = f"{protocol}://{domain}/auth/verify-email/{uid}/{token}/"
        
        context = {
            'user': user,
            'verification_url': verification_url,
            'domain': domain,
            'protocol': protocol,
            'uid': uid,
            'token': token
        }
        
        return cls.send_template_email(
            template_name='email_verification',
            context=context,
            subject='Email Verification Required',
            recipient_list=[user.email],
            fail_silently=fail_silently
        )
    
    @classmethod
    def send_welcome_email(
        cls,
        user,
        fail_silently: bool = True
    ) -> bool:
        """
        Send welcome email to newly registered user
        
        Args:
            user: User instance
            fail_silently: Whether to fail silently on errors
            
        Returns:
            bool: True if email was sent successfully
        """
        context = {
            'user': user,
            'app_name': getattr(settings, 'APP_NAME', 'Infiora')
        }
        
        return cls.send_template_email(
            template_name='welcome',
            context=context,
            subject=f'Welcome to {getattr(settings, "APP_NAME", "Infiora")}!',
            recipient_list=[user.email],
            fail_silently=fail_silently
        )
    
    @classmethod
    def send_account_deactivation_email(
        cls,
        user,
        fail_silently: bool = True
    ) -> bool:
        """
        Send account deactivation confirmation email
        
        Args:
            user: User instance
            fail_silently: Whether to fail silently on errors
            
        Returns:
            bool: True if email was sent successfully
        """
        context = {
            'user': user,
            'app_name': getattr(settings, 'APP_NAME', 'Infiora')
        }
        
        return cls.send_template_email(
            template_name='account_deactivated',
            context=context,
            subject='Account Deactivated',
            recipient_list=[user.email],
            fail_silently=fail_silently
        )