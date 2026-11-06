// lib/liveChatScripts.ts
// The client's default Live Chat scripts (6 topics x 6 options). They are copied into the
// support_topics / support_options tables the first time Live Chat opens and those tables are empty
// for this site. After that the database is the source: edit the rows, not this file.
export type DefaultOption = { label: string; botReply: string; handoffMessage: string; agentGreeting: string };
export type DefaultTopic = { key: string; icon: string; label: string; intro: string; options: DefaultOption[] };

export const DEFAULT_FOLLOW_UP = "Do you still require assistance?";
export const DEFAULT_RESOLVED_MESSAGE = "Great, I'm glad that helped! If you need anything else, just choose a topic or type your message below.";

export const DEFAULT_TOPICS: DefaultTopic[] = [
    {
        "key": "account",
        "icon": "👤",
        "label": "Account & Login Issues",
        "intro": "I can help with account and login issues. What happened?",
        "options": [
            {
                "label": "I cannot log in to my account.",
                "botReply": "We are sorry to hear that you are experiencing difficulties logging into your account. Please try the following steps to regain access:\n• Verify Your Credentials: Ensure that your registered email address or username and password are typed correctly. Watch out for accidental spaces or caps lock.\n• Reset Your Password: If you have forgotten your password, click \"Forgot Password?\" on the login page and follow the prompts.\n• Clear Browser Cache: Try clearing your browser's cookies and cache, or log in using an Incognito window.\n• Alternative Authentication: If you registered using Google, Apple, or another supported provider, please use that specific method to sign in.",
                "handoffMessage": "I am unable to resolve this issue automatically, so I am transferring you to one of our live support representatives. An agent will be with you shortly.",
                "agentGreeting": "Hi! I understand you are having trouble accessing your account, and I would be happy to assist you today. Could you please provide your registered email address?"
            },
            {
                "label": "I didn't receive my password reset email.",
                "botReply": "Let's get that sorted out. Before I connect you to a representative, please verify these quick steps:\n• Check Spam/Junk Folders: Look inside your Spam, Junk, Trash, or Promotions tabs for an automated notification.\n• Verify Email Spelling: Ensure you typed the exact email address associated with your profile on the reset form.\n• Wait 5 Minutes: High network traffic can occasionally delay automated delivery.\n• Whitelist Domain: Add our domain to your email safe-senders list and click \"Resend link\".",
                "handoffMessage": "Thank you for checking. I am transferring you to a live support representative who can manually verify your account data and trigger a verification link.",
                "agentGreeting": "Hi there! I see you're having trouble getting your password reset email. Don't worry, I can help look into this. Could you please confirm your full name and registered email address?"
            },
            {
                "label": "My account is locked or says \"Too many failed attempts.\"",
                "botReply": "To protect your personal information from unauthorized access, our system places a temporary security block after consecutive incorrect password entries.\n• Cooldown Period: This specific lock is temporary and will lift automatically after 30 minutes.\n• Avoid Retrying: Trying to log in again before the timer ends will extend the lockdown period.\n• Check VPN/Network: If you are using a VPN, try disabling it, as a shared IP network can sometimes trigger rate-limits.",
                "handoffMessage": "I will transfer you to an agent who can clear the system block immediately.",
                "agentGreeting": "Hello! I see your account is locked due to failed entry attempts. I can absolutely clear this block for you. Can you please provide your registered email address?"
            },
            {
                "label": "I am not receiving my 2FA/SMS verification code.",
                "botReply": "Security is our priority, let's fix this. Please check the following items on your end:\n• Signal Strength: Ensure your mobile device has a strong cellular network connection.\n• Resend Request: Wait 60 seconds on the login screen, then click \"Resend Code.\"\n• Check Blocked Numbers: Confirm your device hasn't mistakenly muted or blocked notifications from short-code numbers.\n• VoIP Restrictions: Note that virtual numbers (VoIP) or international roaming networks sometimes block automated authentication SMS.",
                "handoffMessage": "Understood. Because this involves your account security settings, I am passing this chat directly to an agent to securely verify your identity.",
                "agentGreeting": "Hello! I understand you're locked out because your security verification codes aren't arriving. For safety purposes, let's start by confirming your account email address."
            },
            {
                "label": "I lost access to my authenticator app or backup codes.",
                "botReply": "If you changed mobile devices, deleted your app, or lost your backup codes, your access parameters must be safely reset.\n• Alternative Option: On the verification screen, look for a link that says \"Try another way\" to check if you can receive an SMS or email option instead.\n• Most Recent Sheet: If you have backup codes but they are being rejected, ensure you are using the most recent set generated; older sheets are deactivated automatically.\nIf you have no alternative methods or keys, a support agent must disable the old app token manually.",
                "handoffMessage": "To protect your account, disabling an authenticator requires human verification. Transferring you to an agent now.",
                "agentGreeting": "Hello! Losing access to an authenticator app can be frustrating. I can assist you with resetting your 2FA profile. To start, may I have your full name and registered email address?"
            },
            {
                "label": "I am concerned about my account security (Compromised Account).",
                "botReply": "Your privacy and safety are our highest priorities. If you notice unusual behavior or suspect unauthorized access, please take action:\n• Change Password Immediately: If you still have access, go to your security settings and update your password to a strong, unique combination.\n• Terminate Active Sessions: Review your \"Active Devices\" list in your profile settings and click \"Log Out of All Other Devices.\"\nIf you are locked out or see changes you didn't make, please speak to an agent immediately.",
                "handoffMessage": "I am escalating this immediately to our security response team. Please hold while I connect you to a live representative.",
                "agentGreeting": "Hello. I understand you have urgent concerns regarding your account security. Let's secure your profile right away. Please provide your registered email address and mention any unauthorized activity you noticed."
            }
        ]
    },
    {
        "key": "payment",
        "icon": "💳",
        "label": "Top Up & Payment",
        "intro": "I can help with top-ups and payments. What happened?",
        "options": [
            {
                "label": "My payment or top-up failed.",
                "botReply": "We are sorry to hear that your transaction did not go through. Please review these common causes before trying again:\n• Card & Verification Details: Ensure your card number, expiration date, and CVV code are entered correctly.\n3D Secure / OTP Verification: Make sure you completed the secondary verification pop-up (One-Time Password) from your bank.\n• Sufficient Funds: Confirm that your card or bank account has enough funds to cover the transaction amount.\n• International Blocks: If you are paying from abroad, your bank might be blocking the transaction for security reasons.",
                "handoffMessage": "I am unable to process this payment automatically. I am transferring you to a billing specialist to check our server response logs. One moment, please.",
                "agentGreeting": "Hi! I am a billing specialist from customer care. I understand your top-up or payment is failing, and I would be happy to help look into this. Could you please provide your registered email address and the payment method you are trying to use?"
            },
            {
                "label": "I was charged, but my account balance didn't update.",
                "botReply": "Don't worry, let's trace your transaction. Sometimes there is a slight synchronization delay between your bank and our platform:\n• Wait 5 Minutes & Refresh: Try logging out of your account, logging back in, and refreshing the webpage to force a balance update.\n• Check Bank Statement: Verify if the funds were actually deducted or if they are just marked as a temporary \"Pending\" authorization hold by your bank.\n• Check Email Inbox: Look for an automated digital receipt from our system to confirm the transaction went through successfully.",
                "handoffMessage": "Thank you for checking. I am transferring this chat to an agent who can manually locate the transaction reference code and credit your account balance.",
                "agentGreeting": "Hello! I see that you were charged but your profile balance has not updated. I can certainly trace this for you. Could you please share your registered email address and, if available, the transaction ID or the exact amount charged?"
            },
            {
                "label": "My saved card/payment method is not working.",
                "botReply": "Let's get your payment profiles working correctly. If your saved card is throwing an error, try these troubleshooting steps:\n• Expired Card Check: Check if the saved card has reached its expiration date. If it has, delete it and add the new one.\n• Update Billing Address: Make sure the zip/postal code and billing address saved on our website match the address registered with your bank.\n• Delete and Re-add: Go to your Payment Settings, delete the problematic saved card completely, clear your browser cache, and link it as a fresh card.",
                "handoffMessage": "Let me bring in a live agent to inspect your billing dashboard settings. Connecting you now.",
                "agentGreeting": "Hi there! I see you are having trouble utilizing your saved payment profile. For your security, please do not type your full card number in this chat. To begin, could you please provide your account email address?"
            },
            {
                "label": "I want to cancel my auto-top-up or subscription.",
                "botReply": "You can manage or disable your recurring payment preferences directly from your account dashboard. Here is how:\n• Navigate to Billing: Log into your profile, click on your avatar, and go to \"Billing & Subscriptions.\"\n• Manage Auto-Top-Up: Locate the \"Auto-Top-Up\" or \"Recurring Billing\" toggle switch.\n• Turn Off: Click the toggle to switch it to \"Off\" and click \"Confirm Changes\" to prevent future automated charges.",
                "handoffMessage": "I will route you to a customer care agent who can update your recurring payment parameters immediately.",
                "agentGreeting": "Hello! I can absolutely assist you with canceling your automatic top-up settings. To proceed with this request, may I please have your full name and the registered email address linked to your account?"
            },
            {
                "label": "I need a refund for an accidental duplicate charge.",
                "botReply": "If you clicked the payment button twice or experienced a network error that resulted in a duplicate charge, we can review it for a refund:\n• Pending Holds: Please note that duplicate charges are occasionally temporary processing holds that disappear from your bank statement within 3 to 5 business days.\n• Invoice Review: Check your \"Transaction History\" tab to see if two separate invoices were generated.\nTo submit a formal adjustment or refund request, please speak with an agent.",
                "handoffMessage": "I am transferring your request to our billing and compliance team to initiate the review and refund process.",
                "agentGreeting": "Hi. I understand you have encountered a duplicate charge and require a reversal. Let's get this sorted out for you. Could you please share your account email address and the dates of the transactions?"
            },
            {
                "label": "I want to change my billing currency or country.",
                "botReply": "Available payment methods and pricing options vary by region. If you need to switch your local currency settings, please check the following:\n• Regional IPs: Our platform automatically detects your location via your IP address. If you are using a VPN, it may lock you into the wrong currency grid.\n• Account Restrictions: In some cases, localized profiles cannot change regions if there is an active balance or pending subscription remaining.\nAn agent must review your region locks to update your currency settings safely.",
                "handoffMessage": "I am passing this chat over to a representative who can adjust your regional profile details.",
                "agentGreeting": "Hello! I can help change your account's billing country and currency parameters. To update your profile, could you please provide your registered email address and confirm your new country of residence?"
            }
        ]
    },
    {
        "key": "coins",
        "icon": "💰",
        "label": "Coins & Rewards",
        "intro": "I can help with coins and rewards. What happened?",
        "options": [
            {
                "label": "I bought coins/credits, but they haven't arrived.",
                "botReply": "Don't worry, let's trace your virtual balance. Sometimes there is a minor sync lag between the payment gateway and your inventory:\n• Refresh & Relog: Try logging out of your account, clearing your browser cache, and logging back in to force an inventory sync.\n• Verify Payment: Confirm that you received a successful transaction receipt via your email inbox.\n• Check Order History: Go to your profile avatar, select \"Order History,\" and check if the order status is marked as \"Completed\" or \"Pending.\"",
                "handoffMessage": "Thank you for confirming. I am transferring this chat to an agent who can verify your invoice and manually add the coins to your profile balance.",
                "agentGreeting": "Hi! I am happy to help resolve your missing coin balance today. Let's look into this right away. Could you please share your registered email address and your transaction or order reference number?"
            },
            {
                "label": "I completed a task/referral, but I didn't get my rewards.",
                "botReply": "Let's verify your reward eligibility parameters. Promotional credit delays are often tied to specific processing rules:\n• Review Processing Times: Some promotional tasks, surveys, or referral milestones require up to 24 to 48 hours to fully process and clear.\n• Check Referral Status: If this was a referral, ensure that your referee fully completed their account signup and verified their email address.\n• Terms & Conditions: Double-check the promotional banner rules to ensure all criteria were met.",
                "handoffMessage": "Understood. I will pass this directly to a support agent who can review your promotional activity logs and credit your account manually.",
                "agentGreeting": "Hello! I understand you are missing rewards from a completed task or referral. I can look into our tracking system for you. May I please have your account email and the username or email of the person you referred?"
            },
            {
                "label": "I am getting an error when trying to redeem a promo code.",
                "botReply": "If the system is rejecting a coupon or promo code, please check for these common configuration issues:\n• Exact Spelling: Codes are highly case-sensitive. Ensure there are no accidental spaces at the beginning or end of the text field.\n• Expiration Check: Verify the promotional campaign dates to ensure the voucher code hasn't already expired.\n• Account Limits: Many coupon codes are strictly restricted to one use per user or are limited only to newly registered accounts.",
                "handoffMessage": "Let me bring in a live agent who can check the code's active status and apply it to your account on the backend.",
                "agentGreeting": "Hi there! I see you are having trouble redeeming a promotional code. Let me check the validity of that voucher for you. Could you please share your account email and type the exact code you are trying to use?"
            },
            {
                "label": "My reward points or coins disappeared unexpectedly.",
                "botReply": "Virtual balances fluctuate based on activity or policy rules. Let's find out what happened to your balance:\n• Check Expiration Policies: Please note that certain promotional reward points or seasonal coins have an expiration date if left unused.\n• Review Activity Ledger: Click on your \"Coins Ledger\" or \"Rewards History\" tab to check if any automated deductions or background purchases occurred.\nIf you believe this deduction was a system error, an agent can audit your balance history.",
                "handoffMessage": "I will transfer you to a support specialist right away to audit your historical balance ledgers.",
                "agentGreeting": "Hello. I understand you are experiencing an unexpected drop in your coin or reward balance. I can absolutely pull up your ledger history to investigate. Can you please provide your registered email address?"
            },
            {
                "label": "I want to transfer coins or rewards to another account.",
                "botReply": "Let's look at our platform's balance allocation rules:\n• Account Locks: To prevent fraud and secure user assets, balances, items, and earned reward points are strictly non-transferable between separate profiles.\n• Alternative Gift Options: If you wish to purchase coins for a friend, please utilize our official \"Gift Store\" option at checkout instead of shifting existing balances.\nIf you accidental created a duplicate profile and need to merge balances, please speak with an agent.",
                "handoffMessage": "Merging profiles requires strict security verification. Transferring you to an agent to handle this request.",
                "agentGreeting": "Hi! I can assist you with an account consolidation inquiry. To safely merge or review your profiles, could you please provide the registered email addresses for both accounts?"
            },
            {
                "label": "The rewards shop/redemption page won't load.",
                "botReply": "If the digital storefront or redemption system is failing to display, it is usually a localized browser communication error:\n• Incompatible Extensions: Turn off ad-blockers or privacy extensions temporarily, as they frequently mistake reward counters for tracking scripts.\n• Clear Browsing Data: Clear your web browser's cookies and cache data, or try opening the redemption page using an Incognito window.\n• Device Swap: Attempt to open the rewards page from a mobile browser or alternative device to check if the block clears.\nIf the page remains broken or blank, our technical support team needs to step in.",
                "handoffMessage": "I am escalating this chat to an agent so our technical team can check for server-side marketplace outages.",
                "agentGreeting": "Hello! I'm sorry to hear the rewards storefront isn't loading for you. I will look into our system status immediately. While I verify our servers, could you please confirm your account email address?"
            }
        ]
    },
    {
        "key": "reading",
        "icon": "📖",
        "label": "Stories & Reading",
        "intro": "I can help with stories and reading. What happened?",
        "options": [
            {
                "label": "I unlocked a story/chapter, but it's still locked.",
                "botReply": "Let's get that content unlocked for you. Sometimes there is a small delay in updating your reading permissions:\n• Refresh the Page: Try refreshing your web browser or clicking away to the homepage and returning to the story.\n• Check Transaction Ledger: Verify in your \"Coins History\" or \"Purchase Ledger\" that the coins or tokens were actually deducted for this specific chapter.\n• Relog Sync: Log out of your account, clear your browser cache, and log back in to force an account permission sync.",
                "handoffMessage": "Thank you for confirming. I am transferring this chat to a support representative who can manually check your reading permissions and unlock the chapter for you.",
                "agentGreeting": "Hi! I am sorry to hear you're experiencing a access issue with your story. I can fix this right away. Could you please share your registered email address and the title of the story or chapter number you are trying to access?"
            },
            {
                "label": "My reading progress or library saved books disappeared.",
                "botReply": "Let's help recover your reading history and bookmarks. Missing data is usually tied to account sync anomalies:\n• Check Your Login Method: Ensure you logged in using your exact original method (e.g., matching email address vs. Google Sign-In button). You might be accidentally logged into a blank guest account.\n• Check the Archive: Look inside your library sub-folders to ensure the story wasn't accidentally moved to your \"Archive\" or \"Finished\" tab.\n• Cloud Refresh: Refresh the page while holding Ctrl + F5 (or Cmd + Shift + R on Mac) to force your library data to reload from our cloud database.",
                "handoffMessage": "I understand how frustrating it is to lose your progress. I am passing this chat to an agent who can search our database backups to restore your profile history.",
                "agentGreeting": "Hello! I can assist you with restoring your library data and reading history. Let's look into our system backups. Can you please provide your registered email address and a few names of the stories that were in your library?"
            },
            {
                "label": "The story pages are blank or won't load properly.",
                "botReply": "If text blocks, images, or chapters are failing to display, it is usually a localized browser rendering error:\n• Disable Extensions: Turn off browser ad-blockers, translation plug-ins, or dark-mode extensions temporarily, as they can break story scripts.\n• Clear Browsing Data: Clear your web browser's cookies and cache, or try opening the story chapter in an Incognito window.\n• Check Network Restrictions: If you are using public Wi-Fi, ensure content filtering isn't blocking our story delivery servers.",
                "handoffMessage": "Let me bring in a live customer support representative to report this loading error to our technical engineering team. Connecting you now.",
                "agentGreeting": "Hi there! I'm sorry the text pages aren't rendering for you today. Let's get this investigated. Could you please confirm your account email, the title of the story, and the specific web browser you are using (e.g., Chrome, Safari)?"
            },
            {
                "label": "I want to report a typo, broken link, or formatting issue in a story.",
                "botReply": "Thank you for helping us maintain content quality on our site! Let's get this information to the editing team:\n• Formatting Check: If sentences look clipped or overlapped, try adjusting the font size or background theme using the \"Aa\" Reading Settings icon on the top corner of the reading window.\n• Refresh Chapter: Sometimes a quick refresh fixes temporary text asset delivery glitches.\nIf the text is genuinely broken or mistranslated, an agent can lodge a formal content review ticket.",
                "handoffMessage": "I will transfer you to an agent so you can share the exact location of the content error for our editorial team to fix.",
                "agentGreeting": "Hello! Thank you for reporting this formatting anomaly. I can submit a correction ticket directly to our publishing operations team. May I have your email, the book title, and the specific chapter number where this error occurs?"
            },
            {
                "label": "I cannot post comments or reviews on stories.",
                "botReply": "If you are blocked from commenting or leaving reviews on a book, please verify the following platform rules:\n• Email Verification: Make sure your account profile email address has been fully verified via the confirmation link we sent your inbox during signup.\n• Community Guidelines: Ensure your account hasn't been temporarily restricted due to a previous comment filtering system flag or moderation event.\n• System Cooldown: If you have posted multiple reviews rapidly, our server safety features may place a brief cooldown timer on your account activity.\nIf you believe your profile is restricted in error, an agent can check your status.",
                "handoffMessage": "Let me connect you with an agent who can check your profile's comment permissions and moderation logs.",
                "agentGreeting": "Hi! I can check your account profile configuration to see why your review permissions are locked. Could you please provide your registered email address so I can audit your profile status?"
            },
            {
                "label": "I want to cancel my premium reading VIP pass.",
                "botReply": "You can easily manage or disable your VIP membership access directly from your web profile interface:\n• Go to Subscriptions: Log into your profile menu, click on your avatar icon, and select \"VIP Pass / Subscriptions.\"\n• Cancel Plan: Click on the \"Cancel Membership\" or \"Manage Automatic Renewal\" button.\n• Confirm Choice: Complete the cancellation prompts. Your premium reading access will remain active until the end of your current billing period.",
                "handoffMessage": "I will route you to a support agent who can manually process your membership termination immediately.",
                "agentGreeting": "Hello! I can certainly assist you with disabling your premium reading membership auto-renewals. To process this instruction securely, could you please provide your full name and the registered email address linked to your account?"
            }
        ]
    },
    {
        "key": "technical",
        "icon": "❌",
        "label": "Technical Problems",
        "intro": "I can help with technical problems. What happened?",
        "options": [
            {
                "label": "The website keeps crashing or frozen on a loading screen.",
                "botReply": "We are sorry the site is freezing up. This is usually due to conflicting local files. Please try these quick steps to unfreeze it:\n• Force Refresh: Press Ctrl + F5 (or Cmd + Shift + R on a Mac) to force your browser to bypass its saved cache and fetch the newest live code.\n• Incognito Test: Try opening the page inside a private browsing window to check if local browser add-ons are causing the lockup.\n• Check Browser Type: Ensure your browser (Chrome, Safari, Edge, or Firefox) is fully updated to its latest release.",
                "handoffMessage": "Thank you for confirming. I will transfer you to a technical support representative right away so we can grab your device logs and fix this.",
                "agentGreeting": "Hi there! I'm sorry the site is locking up on you today. Let's dig into this technical issue together. Could you please provide your registered account email and let me know what device you are using?"
            },
            {
                "label": "I am receiving an \"Error 403 / Access Denied\" message.",
                "botReply": "A 403 or Access Denied message means our server's security wall is actively blocking your browser connection. Please check the following parameters:\n• Turn Off Your VPN: Security firewalls frequently block public VPN server addresses or proxy endpoints to prevent spam traffic.\n• Clear System Cookies: Go to your web browser settings and clear site cookies, as corrupted login session keys can trigger network blocks.\n• Network Swap: Switch your machine over to an alternative network connection (like your mobile hotspot) to see if the local IP is blocked.",
                "handoffMessage": "Understood. I am transferring this chat to a system administrator who can review our firewall logs and whitelist your access token.",
                "agentGreeting": "Hello! Access errors can be highly frustrating. I can look directly into our network safety logs to find out why your connection is blocked. May I have your account email and your current IP address if you know it?"
            },
            {
                "label": "The site looks misaligned, messy, or broken layout.",
                "botReply": "If the text, images, or layout elements are scrambled or overlapping on your screen, try these quick presentation fixes:\n• Reset Page Zoom: Press Ctrl + 0 (or Cmd + 0 on Mac) to make sure your browser zoom is at its standard 100% resolution.\n• Disable Extensions: Turn off styling extensions, dark-mode toggles, or script-blockers, as they frequently override our platform style architecture.\n• Check Resolution: If you are using a unique screen aspect ratio, try resizing your desktop browser window to force a responsive layout snap.",
                "handoffMessage": "Let me pass this chat directly to an agent so you can share your browser details for our user-experience engineering patch team.",
                "agentGreeting": "Hi! A broken layout definitely gets in the way of a smooth experience. Let's gather some layout data to fix it. Can you please share your account email and the specific browser you are running?"
            },
            {
                "label": "Videos, audio, or media links are not playing.",
                "botReply": "If media files or audio streams are falling silent or throwing playback errors, check these local hardware and software components:\n• Autoplay Permissions: Look at the left side of your browser address bar and verify that media playback permissions are set to \"Allow.\"\n• Audio Device Sync: Ensure your speakers or Bluetooth headphones are connected properly before loading the page track.\n• Clear Browser Cache: Clear your cache to force your system to download the latest media streaming player frameworks.",
                "handoffMessage": "I am escalating this to our streaming operations support team. Please hold while I route you to a live assistant.",
                "agentGreeting": "Hello. Let's fix this media playback error for you right away. While I inspect our media delivery servers, could you please share your profile email address and the specific title or link you are trying to open?"
            },
            {
                "label": "I keep getting automatically logged out of my session.",
                "botReply": "If the site continuously kicks you out or asks you to log in repeatedly, it is usually a problem with your browser's cookie storage:\n• Enable Cookies: Make sure your web browser isn't set to \"Block All Cookies,\" as this stops our site from remembering your login state.\n• Avoid Incognito: Private browsing windows delete session tokens automatically whenever you close a tab or lose connectivity.\n• Clear Cache Data: Old, overlapping cookie files can conflict with new sessions. Perform a complete cache flush.",
                "handoffMessage": "Let's get an agent to see if there is an account verification lock or a server configuration conflict on your unique profile ID.",
                "agentGreeting": "Hi there! Constant logouts are incredibly annoying. Let's look up your profile security logs to pinpoint why the token is dropped. Could you please share your registered account email?"
            },
            {
                "label": "Buttons are unresponsive when clicked.",
                "botReply": "If clicking on submission fields, buttons, or checkboxes does absolutely nothing, it points to a script execution blockage:\n• Disable Ad-Blockers: Privacy block extensions often mistake functional site buttons for advertisement links and shut them down.\n• Update JavaScript: Ensure that JavaScript settings are turned \"On\" inside your core web browser settings panel.\n• Refresh Page: Try a quick page refresh to catch any scripts that failed to initialize during the first load cycle.",
                "handoffMessage": "I am routing this case immediately to an agent so our engineering team can isolate the broken interaction script.",
                "agentGreeting": "Hello! Unresponsive buttons usually mean a script error is happening behind the scenes. I am happy to help resolve this. To check your site interactions, could you please provide your registered email address?"
            }
        ]
    },
    {
        "key": "other",
        "icon": "❓",
        "label": "Other Questions",
        "intro": "I can help with other questions. What would you like to do?",
        "options": [
            {
                "label": "My question or issue isn't listed anywhere in the menus.",
                "botReply": "We want to make sure your specific issue gets resolved! Any question or problem you have can be sent directly to a live agent. Before I connect you, feel free to check our general resources:\n• Global Search Box: Try typing key terms into the search bar at the top of our Help Center / FAQ Page to find related support articles.\n• Direct Transfer: If you prefer, just type your question or select the option below to talk directly with our support team.",
                "handoffMessage": "Thank you for checking. I am transferring this chat to a general customer care representative who can review your request manually. One moment, please.",
                "agentGreeting": "Hi there! I would be happy to help look into your unique request today. To get started, could you please provide your registered account email and briefly explain what you need help with?"
            },
            {
                "label": "I am a creator/writer and have questions about publishing my content.",
                "botReply": "We are thrilled that you want to publish your creative work with us!\n• Join Our Platform: If you want to publish stories, track monetization, or enter writing contests, you can sign up directly at FANGWriters (fangwriters.com), our dedicated platform for creators.\n• Submission Guide: Once registered on FANGWriters, you can read through the official publishing handbook to understand copyright guidelines, payout structures, and contract options.\nIf you are facing an error with an active submission or your creator account dashboard on FANGWriters, any question can be sent directly to an agent.",
                "handoffMessage": "Let me connect you with a creator support specialist who can look into our active editorial and review queues on FANGWriters for you.",
                "agentGreeting": "Hi there! Congratulations on your story submission. Let's check the status of your review queue. Could you please share your FANGWriters account email and the title of the work you submitted?"
            },
            {
                "label": "I want to know about your current promotions, contests, or events.",
                "botReply": "All of our writing promotions, active contests, and creator events are run and managed directly through our creator platform, FANGWriters (fangwriters.com).\n• FANGWriters Dashboard: Log into your profile at FANGWriters and check the \"Contests & Events\" tab to view live leaderboards, active writing challenges, and rules.\n• Social Channels: You can also follow our official FANGWriters community groups for surprise voucher giveaways and upcoming challenge announcements.\nIf a specific contest reward or leaderboard ranking on FANGWriters is glitching for you, any questions can be directed to an agent for an audit.",
                "handoffMessage": "I will route you to a community event organizer who can check the FANGWriters winners' roster and apply your event rewards.",
                "agentGreeting": "Hello! Congratulations on winning our community challenge! Let's get your rewards sorted out. Could you please share your FANGWriters account email address and the specific name of the event or contest you won?"
            },
            {
                "label": "I want to submit feedback, a feature suggestion, or an idea.",
                "botReply": "We love hearing from our community! Your ideas directly impact how we improve our websites. Any question, idea, or feedback can be sent straight to our team:\n• Feedback Form: You can submit formal ideas anytime by clicking the \"Send Feedback\" link found in the footer at the very bottom of our website pages.\nIf you want a live agent to log a specific system recommendation or feature request right now, please select below.",
                "handoffMessage": "I am routing your feedback request over to a customer experience agent who can formally document your suggestion.",
                "agentGreeting": "Hello! Thank you for taking the time to share your ideas with us. I can absolutely log this feature request for our design team. Could you please share your account email and describe your suggestion?"
            },
            {
                "label": "I am interested in a business partnership, sponsorship, or media inquiry.",
                "botReply": "Thank you for your interest in collaborating with us! For corporate, marketing, or press inquiries, please use our dedicated business channels:\n• Media Kit: You can download our current brand assets and media kits directly from our \"Press & Media\" landing page.\n• Corporate Email: For formal proposals, please send a detailed deck directly to our outreach team at partnerships@website.com.\nIf you have any other questions regarding business relationships, I can transfer you to a live representative.",
                "handoffMessage": "I will transfer you to an agent who can gather your contact information and route it directly to our marketing and corporate relations desk.",
                "agentGreeting": "Hello! Thank you for reaching out for a potential collaboration. I can forward your inquiry to the correct department. Could you please provide your name, business email, and a brief summary of your proposal?"
            },
            {
                "label": "I want to report a user, bad behavior, or a community guideline violation.",
                "botReply": "Keeping our digital space safe and welcoming is our top priority. If you encounter harassment, spam, or toxic behavior, you can report it directly to an agent or use our built-in features:\n• In-App Reporting: Click the \"Report\" icon flag located directly next to the problematic comment, review, or user profile to send it straight to our moderation queue.\n• Block Feature: Click on the user's profile icon and select \"Block User\" to instantly hide all of their future messages and content from your view.\nIf you are facing an urgent safety issue or severe harassment, an agent will intervene manually right away.",
                "handoffMessage": "I am escalating this report immediately to our safety and moderation compliance team. Please hold while I connect you to a live representative.",
                "agentGreeting": "Hello. I am very sorry to hear you are dealing with this behavior. Let's secure your experience right away. Please provide your email address, the username of the account bothering you, and any links or screenshots if you have them."
            }
        ]
    }
];