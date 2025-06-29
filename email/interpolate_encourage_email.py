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
            share_text = ("North Swanage traffic survey closes midnight tonight! "
                         "Have your say before it's too late")
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
        
        # Replace referral code placeholders
        content = content.replace('{{user_referral_code}}', referral_code)
        
        # Replace the base URL in the referral link section
        referral_url = self.generate_share_url(referral_code)
        content = content.replace('https://nstcg.org/survey?ref={{user_referral_code}}', referral_url)
        
        # Update share button links
        # WhatsApp button (line ~336)
        whatsapp_pattern = r'href="https://wa\.me/\?text=[^"]*"'
        content = re.sub(whatsapp_pattern, f'href="{share_urls["whatsapp"]}"', content, count=1)
        
        # SMS button (line ~338)
        sms_pattern = r'href="sms:\?body=[^"]*"'
        content = re.sub(sms_pattern, f'href="{share_urls["sms"]}"', content, count=1)
        
        # Email button (line ~340)
        email_pattern = r'href="mailto:\?subject=[^&]*&body=[^"]*"'
        content = re.sub(email_pattern, f'href="{share_urls["email"]}"', content, count=1)
        
        # Social media icons
        # Facebook (line ~348)
        fb_pattern = r'href="https://www\.facebook\.com/sharer/sharer\.php\?u=[^"]*"'
        content = re.sub(fb_pattern, f'href="{share_urls["facebook"]}"', content, count=1)
        
        # Twitter/X (line ~350)
        twitter_pattern = r'href="https://twitter\.com/intent/tweet\?[^"]*"'
        content = re.sub(twitter_pattern, f'href="{share_urls["twitter"]}"', content, count=1)
        
        # WhatsApp icon (line ~352)
        wa_icon_pattern = r'href="https://wa\.me/\?text=[^"]*"'
        content = re.sub(wa_icon_pattern, f'href="{share_urls["whatsapp"]}"', content, count=2)
        
        # LinkedIn (line ~354)
        linkedin_pattern = r'href="https://www\.linkedin\.com/sharing/share-offsite/\?url=[^"]*"'
        content = re.sub(linkedin_pattern, f'href="{share_urls["linkedin"]}"', content, count=1)
        
        # Optional: Update dynamic content if provided
        if 'response_count' in user_data:
            count = user_data['response_count']
            target = user_data.get('target_count', 1000)
            needed = target - count
            percentage = (count / target * 100) if target > 0 else 0
            
            # Update status numbers
            content = re.sub(
                r'<div class="status-numbers">.*?</div>',
                f'<div class="status-numbers">{count} responses ✓ | Target: {target:,} | Needed: {needed} more</div>',
                content,
                flags=re.DOTALL
            )
            
            # Update progress bar
            content = re.sub(
                r'width: \d+\.?\d*%',
                f'width: {percentage:.1f}%',
                content,
                count=1
            )
            
            # Update percentage text
            content = re.sub(
                r'\d+\.?\d*% to victory',
                f'{percentage:.1f}% to victory',
                content
            )
        
        if 'hours_remaining' in user_data:
            hours = user_data['hours_remaining']
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