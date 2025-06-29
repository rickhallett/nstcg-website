#!/usr/bin/env python3
"""
Script to interpolate user-specific data into encourage.html email template.
Generates personalized email content with correct referral links and share URLs.
"""

import sys
import urllib.parse
import re
from pathlib import Path

class EmailLinkInterpolator:
    """Handles link generation and template interpolation for encourage emails."""
    
    SITE_URL = "https://nstcg.org"
    
    # Platform codes matching the website's ReferralUtils.PLATFORM_CODES
    PLATFORM_CODES = {
        'twitter': 'TW',
        'facebook': 'FB',
        'whatsapp': 'WA',
        'linkedin': 'LI',
        'email': 'EM',
        'copy': 'CP'
    }
    
    def __init__(self, template_path='encourage.html'):
        """Initialize with the email template."""
        # Handle relative paths properly
        if not Path(template_path).is_absolute():
            # Look for template in same directory as script
            script_dir = Path(__file__).parent
            self.template_path = script_dir / template_path
        else:
            self.template_path = Path(template_path)
            
        if not self.template_path.exists():
            raise FileNotFoundError(f"Template file not found: {self.template_path}")
        
        with open(self.template_path, 'r', encoding='utf-8') as f:
            self.template = f.read()
    
    def generate_share_url(self, referral_code, platform=None):
        """Generate share URL with referral tracking."""
        url = f"{self.SITE_URL}/?ref={referral_code}"
        if platform and platform in self.PLATFORM_CODES:
            url += f"&src={self.PLATFORM_CODES[platform]}"
        return url
    
    def generate_share_urls(self, referral_code, share_text=''):
        """Generate all platform-specific share URLs."""
        base_url = self.generate_share_url(referral_code)
        encoded_url = urllib.parse.quote(base_url, safe='')
        encoded_text = urllib.parse.quote(share_text, safe='')
        
        # Default share text if none provided
        if not share_text:
            share_text = ("The closing of Shore Road in Swanage will have impacts on traffic, "
                         "tourists and residents for years to come. The survey closes midnight tonight!")
            encoded_text = urllib.parse.quote(share_text, safe='')
        
        return {
            'twitter': f"https://twitter.com/intent/tweet?text={encoded_text}&url={encoded_url}&hashtags=SaveNorthSwanage,TrafficSafety",
            'facebook': f"https://www.facebook.com/sharer/sharer.php?u={encoded_url}",
            'whatsapp': f"https://wa.me/?text={encoded_text}%20{encoded_url}",
            'linkedin': f"https://www.linkedin.com/sharing/share-offsite/?url={encoded_url}",
            'email': f"mailto:?subject={urllib.parse.quote('Traffic Survey Closes Tonight')}&body={encoded_text}%20{encoded_url}",
            'sms': f"sms:?body={encoded_text}%20{base_url}",
            'copy': base_url
        }
    
    def interpolate(self, user_data):
        """
        Interpolate user data into the email template.
        
        Args:
            user_data (dict): User information including:
                - referral_code: User's unique referral code
                - name: User's name (optional)
                - email: User's email (optional)
                - custom_share_text: Custom message for shares (optional)
                - response_count: Current response count (optional)
                - target_count: Target response count (optional)
                - hours_remaining: Hours until deadline (optional)
        
        Returns:
            str: Interpolated HTML content
        """
        referral_code = user_data.get('referral_code', 'DEFAULTCODE')
        share_text = user_data.get('custom_share_text', '')
        
        # Generate all share URLs
        share_urls = self.generate_share_urls(referral_code, share_text)
        
        # Start with the template
        content = self.template
        
        # Replace all template variables
        content = content.replace('{{user_referral_code}}', referral_code)
        
        # Calculate dynamic values
        response_count = user_data.get('response_count', 555)
        target_count = user_data.get('target_count', 1000)
        needed_count = target_count - response_count
        progress_percentage = (response_count / target_count * 100) if target_count > 0 else 0
        
        # Replace numeric placeholders
        content = content.replace('{{response_count}}', str(response_count))
        content = content.replace('{{target_count}}', str(target_count))
        content = content.replace('{{needed_count}}', str(needed_count))
        content = content.replace('{{progress_percentage}}', f"{progress_percentage:.1f}")
        
        # Replace share text encoded placeholder
        share_text_encoded = urllib.parse.quote(share_text if share_text else 
                                               "The closing of Shore Road in Swanage will have impacts on traffic, tourists and residents for years to come. The survey closes midnight tonight!", 
                                               safe='')
        content = content.replace('{{share_text_encoded}}', share_text_encoded)
        
        # For MJML-compiled HTML, the share URLs are already in the template with placeholders
        # We just need to ensure all placeholders are replaced
        
        # Optional: Update hours remaining if provided
        if 'hours_remaining' in user_data:
            hours = user_data['hours_remaining']
            # Update any remaining time references in the compiled HTML
            content = re.sub(
                r'Less than \d+ hours remaining!',
                f'Less than {hours} hours remaining!',
                content
            )
        
        return content
    
    def save_interpolated(self, user_data, output_path=None):
        """Save interpolated email to file."""
        content = self.interpolate(user_data)
        
        if output_path is None:
            referral_code = user_data.get('referral_code', 'default')
            output_path = f"encourage_{referral_code}.html"
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return output_path


def main():
    """Example usage and testing."""
    # Create interpolator
    interpolator = EmailLinkInterpolator()
    
    # Example user data
    test_user = {
        'referral_code': 'JOHBD7K9XYZ',
        'name': 'John Smith',
        'email': 'john@example.com',
        'custom_share_text': 'Please help save our neighbourhood streets!',
        'response_count': 597,
        'target_count': 1000,
        'hours_remaining': 12
    }
    
    # Generate interpolated email
    output_file = interpolator.save_interpolated(test_user)
    print(f"✓ Generated email saved to: {output_file}")
    
    # Show some example URLs
    print("\nExample share URLs generated:")
    urls = interpolator.generate_share_urls(test_user['referral_code'])
    for platform, url in urls.items():
        if platform != 'copy':  # Skip showing the base URL twice
            print(f"  {platform}: {url[:60]}...")


if __name__ == "__main__":
    # If command line args provided, use them
    if len(sys.argv) > 1:
        referral_code = sys.argv[1]
        user_data = {'referral_code': referral_code}
        
        # Optional additional args
        if len(sys.argv) > 2:
            user_data['response_count'] = int(sys.argv[2])
        if len(sys.argv) > 3:
            user_data['target_count'] = int(sys.argv[3])
        
        interpolator = EmailLinkInterpolator()
        output = interpolator.save_interpolated(user_data)
        print(f"Generated: {output}")
    else:
        # Run test/demo
        main()