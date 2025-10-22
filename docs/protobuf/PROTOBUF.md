# Protobuf for reddit/games

See `app.proto` for the extrated protobuf.

Found this npm package @devvit/protos

https://www.jsdelivr.com/package/npm/@devvit/protos?tab=files&path=schema%2F.snootobuf%2Fdeps%2Freddit%2Fdevvit%2Fcommon%2Fv1

out target app is called "cabbageidle"

```js
fetch(
	'https://devvit-gateway.reddit.com/devvit.reddit.custom_post.v1alpha.CustomPost/RenderPostContent',
	{
		headers: {
			accept: '*/*',
			'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
			'content-type': 'application/grpc-web+proto',
			'devvit-accept-language': 'en-GB',
			'devvit-accept-timezone': 'Europe/Copenhagen',
			'devvit-actor': 'main',
			'devvit-installation': '7f2e80d7-6821-4a20-9405-05c3b43012ea',
			'devvit-post': 't3_1lvdwlq',
			'devvit-user-agent': 'Reddit;Shreddit;not-provided',
			priority: 'u=1, i',
			'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"Windows"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-site',
			'x-grpc-web': '1',
		},
		referrer: 'https://www.reddit.com/',
		body: "\u0000\u0000\u0000\r*2\n\u0005en-GB\u0012\u0004dark\u001a\u0010\b\u0004\u0010\u0005\u001d\u0000\u0000?%\u0000\u0000`?*\u0011Europe/Copenhagen\n\u0018\n\u0016\n\u0006postId\u0012\f\u001a\nt3_1lvdwlq\u0012Ã\u001a\n\r\n\u0007__cache\u0012\u0002*\u0000\nL\n\u0014anonymous.useState-0\u00124*2\n\u000b\n\u0005value\u0012\u0002\b\u0000\n\u0016\n\nload_state\u0012\b\u001a\u0006loaded\n\u000b\n\u0005error\u0012\u0002\b\u0000\nL\n\u0014anonymous.useState-1\u00124*2\n\u000b\n\u0005value\u0012\u0002 \u0000\n\u0016\n\nload_state\u0012\b\u001a\u0006loaded\n\u000b\n\u0005error\u0012\u0002\b\u0000\nS\n\u0014anonymous.useState-2\u0012;*9\n\u0012\n\u0005value\u0012\t\u0011\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\n\u0016\n\nload_state\u0012\b\u001a\u0006loaded\n\u000b\n\u0005error\u0012\u0002\b\u0000\nÔ\u0010\n\u0014anonymous.useAsync-3\u0012»\u0010*¸\u0010\nú\u000f\n\u0004data\u0012ñ\u000f2î\u000f\nÏ\u0002*Ì\u0002\n\u0019\n\u0003sku\u0012\u0012\u001a\u0010gem_currency_180\n\u0012\n\u0005price\u0012\t\u0011\u0000\u0000\u0000\u0000\u0000\u0000I@\n \n\u000eaccountingType\u0012\u000e\u001a\fUNRECOGNIZED\n\u001a\n\u000bdisplayName\u0012\u000b\u001a\tGem Pouch\n=\n\u000bdescription\u0012.\u001a,180 Gems for use in the Sword & Supper shop.\ni\n\bmetadata\u0012]*[\n\u000f\n\u0006amount\u0012\u0005\u001a\u0003180\n\u0017\n\u000eitemDefinition\u0012\u0005\u001a\u0003Gem\n/\n\bshopicon\u0012#\u001a!assets/ui/shop/ItemIcon_Gem03.png\n3\n\u0006images\u0012)*'\n%\n\u0004icon\u0012\u001d\u001a\u001bproducts/ItemIcon_Gem03.png\nÒ\u0002*Ï\u0002\n\u001a\n\u0003sku\u0012\u0013\u001a\u0011gem_currency_2750\n\u0012\n\u0005price\u0012\t\u0011\u0000\u0000\u0000\u0000\u0000@@\n \n\u000eaccountingType\u0012\u000e\u001a\fUNRECOGNIZED\n\u001a\n\u000bdisplayName\u0012\u000b\u001a\tGem Vault\n>\n\u000bdescription\u0012/\u001a-2750 Gems for use in the Sword & Supper shop.\nj\n\bmetadata\u0012^*\\\n\u0010\n\u0006amount\u0012\u0006\u001a\u00042750\n\u0017\n\u000eitemDefinition\u0012\u0005\u001a\u0003Gem\n/\n\bshopicon\u0012#\u001a!assets/ui/shop/ItemIcon_Gem06.png\n3\n\u0006images\u0012)*'\n%\n\u0004icon\u0012\u001d\u001a\u001bproducts/ItemIcon_Gem06.png\nÎ\u0002*Ë\u0002\n\u0018\n\u0003sku\u0012\u0011\u001a\u000fgem_currency_15\n\u0012\n\u0005price\u0012\t\u0011\u0000\u0000\u0000\u0000\u0000\u0000\u0014@\n \n\u000eaccountingType\u0012\u000e\u001a\fUNRECOGNIZED\n\u001c\n\u000bdisplayName\u0012\r\u001a\u000bGem Handful\n<\n\u000bdescription\u0012-\u001a+15 Gems for use in the Sword & Supper shop.\nh\n\bmetadata\u0012\\*Z\n\u0017\n\u000eitemDefinition\u0012\u0005\u001a\u0003Gem\n/\n\bshopicon\u0012#\u001a!assets/ui/shop/ItemIcon_Gem01.png\n\u000e\n\u0006amount\u0012\u0004\u001a\u000215\n3\n\u0006images\u0012)*'\n%\n\u0004icon\u0012\u001d\u001a\u001bproducts/ItemIcon_Gem01.png\nÒ\u0002*Ï\u0002\n\u001a\n\u0003sku\u0012\u0013\u001a\u0011gem_currency_1100\n\u0012\n\u0005price\u0012\t\u0011\u0000\u0000\u0000\u0000\u0000@o@\n \n\u000eaccountingType\u0012\u000e\u001a\fUNRECOGNIZED\n\u001a\n\u000bdisplayName\u0012\u000b\u001a\tGem Chest\n>\n\u000bdescription\u0012/\u001a-1100 Gems for use in the Sword & Supper shop.\nj\n\bmetadata\u0012^*\\\n\u0010\n\u0006amount\u0012\u0006\u001a\u00041100\n\u0017\n\u000eitemDefinition\u0012\u0005\u001a\u0003Gem\n/\n\bshopicon\u0012#\u001a!assets/ui/shop/ItemIcon_Gem05.png\n3\n\u0006images\u0012)*'\n%\n\u0004icon\u0012\u001d\u001a\u001bproducts/ItemIcon_Gem05.png\nÐ\u0002*Í\u0002\n\u0019\n\u0003sku\u0012\u0012\u001a\u0010gem_currency_400\n\u0012\n\u0005price\u0012\t\u0011\u0000\u0000\u0000\u0000\u0000\u0000Y@\n \n\u000eaccountingType\u0012\u000e\u001a\fUNRECOGNIZED\n\u001b\n\u000bdisplayName\u0012\f\u001a\nGem Bucket\n=\n\u000bdescription\u0012.\u001a,400 Gems for use in the Sword & Supper shop.\ni\n\bmetadata\u0012]*[\n\u000f\n\u0006amount\u0012\u0005\u001a\u0003400\n\u0017\n\u000eitemDefinition\u0012\u0005\u001a\u0003Gem\n/\n\bshopicon\u0012#\u001a!assets/ui/shop/ItemIcon_Gem04.png\n3\n\u0006images\u0012)*'\n%\n\u0004icon\u0012\u001d\u001a\u001bproducts/ItemIcon_Gem04.png\nË\u0002*È\u0002\n\u0018\n\u0003sku\u0012\u0011\u001a\u000fgem_currency_80\n\u0012\n\u0005price\u0012\t\u0011\u0000\u0000\u0000\u0000\u0000\u00009@\n \n\u000eaccountingType\u0012\u000e\u001a\fUNRECOGNIZED\n\u0019\n\u000bdisplayName\u0012\n\u001a\bGem Pile\n<\n\u000bdescription\u0012-\u001a+80 Gems for use in the Sword & Supper shop.\nh\n\bmetadata\u0012\\*Z\n\u000e\n\u0006amount\u0012\u0004\u001a\u000280\n\u0017\n\u000eitemDefinition\u0012\u0005\u001a\u0003Gem\n/\n\bshopicon\u0012#\u001a!assets/ui/shop/ItemIcon_Gem02.png\n3\n\u0006images\u0012)*'\n%\n\u0004icon\u0012\u001d\u001a\u001bproducts/ItemIcon_Gem02.png\n\u0016\n\nload_state\u0012\b\u001a\u0006loaded\n\u000b\n\u0005error\u0012\u0002\b\u0000\n\u0014\n\u0007depends\u0012\t\u0011\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\nL\n\u0014anonymous.useState-4\u00124*2\n\u000b\n\u0005value\u0012\u00022\u0000\n\u0016\n\nload_state\u0012\b\u001a\u0006loaded\n\u000b\n\u0005error\u0012\u0002\b\u0000\nY\n\u0014anonymous.useState-5\u0012A*?\n\u0018\n\u0005value\u0012\u000f\u001a\r1761133444562\n\u0016\n\nload_state\u0012\b\u001a\u0006loaded\n\u000b\n\u0005error\u0012\u0002\b\u0000\nL\n\u0014anonymous.useState-6\u00124*2\n\u000b\n\u0005value\u0012\u0002 \u0000\n\u0016\n\nload_state\u0012\b\u001a\u0006loaded\n\u000b\n\u0005error\u0012\u0002\b\u0000\nS\n\u0014anonymous.useState-7\u0012;*9\n\u0012\n\u0005value\u0012\t\u0011\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\n\u0016\n\nload_state\u0012\b\u001a\u0006loaded\n\u000b\n\u0005error\u0012\u0002\b\u0000\nQ\n\u0014anonymous.useState-8\u00129*7\n\u0010\n\u0005value\u0012\u0007\u001a\u0005AKJ90\n\u0016\n\nload_state\u0012\b\u001a\u0006loaded\n\u000b\n\u0005error\u0012\u0002\b\u0000\nZ\n\u0014anonymous.useAsync-9\u0012B*@\n\n\n\u0004data\u0012\u0002 \u0000\n\u0016\n\nload_state\u0012\b\u001a\u0006loaded\n\u000b\n\u0005error\u0012\u0002\b\u0000\n\r\n\u0007depends\u0012\u0002\b\u0000\n\u0001\n\u0015anonymous.useState-10\u0012j*h\nA\n\u0005value\u00128*6\n \n\nauthorName\u0012\u0012\u001a\u0010swordnsupper_mod\n\u0012\n\u0005title\u0012\t\u001a\u0007The Inn\n\u0016\n\nload_state\u0012\b\u001a\u0006loaded\n\u000b\n\u0005error\u0012\u0002\b\u0000\nT\n\u0015anonymous.useState-11\u0012;*9\n\u0012\n\u0005value\u0012\t\u0011\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\n\u0016\n\nload_state\u0012\b\u001a\u0006loaded\n\u000b\n\u0005error\u0012\u0002\b\u0000\nª\u0001\n\u0015anonymous.useState-12\u0012\u0001*\u0001\nf\n\u0005value\u0012]*[\n\r\n\u0007mission\u0012\u0002\b\u0000\n\u0011\n\u000benemyTaunts\u0012\u00022\u0000\n\u0012\n\fscenarioText\u0012\u0002\u001a\u0000\n\u000f\n\tisInnPost\u0012\u0002 \u0001\n\u0012\n\u0005plays\u0012\t\u0011\u0000\u0000\u0000\u0000\u0000\u0000\u0000@\n\u0016\n\nload_state\u0012\b\u001a\u0006loaded\n\u000b\n\u0005error\u0012\u0002\b\u0000\nI\n\u0017anonymous.useWebView-13\u0012.*,\n\u0019\n\fmessageCount\u0012\t\u0011\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\n\u000f\n\tisMounted\u0012\u0002 \u0000\n\u001b\n\u0015anonymous.payments-14\u0012\u0002*\u0000\u001a\u0005j\u0000\u0001\u0000",
		method: 'POST',
		mode: 'cors',
		credentials: 'include',
	},
);
```

Response:

```
AAAAAf0KDwoNCgdfX2NhY2hlEgIqABrpAxrmAwrjAwrdAwgBKhQSCQoHDQDAIUQQARoHCgUNAADIQhqcAxKZAwgBEo4DCAEqFBIJCgcNAMAhRBABGgcKBQ0AAMhCGvACEu0CCAISNwgEGjAqLgokaHR0cHM6Ly9pLnJlZGQuaXQvcXNwbWE1Zmd0Z2JmMS5qcGVnEIAGGKIEKAI6ATASqQIIASoLEgkKBw0AwCFEEAEalAISkQIIARIWCAUqCxoJCgcNAACMQhABGgIyADoBMBJKCAQqFBISCgcNAMChQxABEgcNAACWQxABGi0qKwojaHR0cHM6Ly9pLnJlZGQuaXQvZTNmZHNhZWd0Z2JmMS5wbmcQnAQYjwE6ATESFggFKgsaCQoHDQAADEMQARoCMgA6ATISigEIBCoUEhIKBw0AwCFDEAESBw0AADRDEAEaLSorCiNodHRwczovL2kucmVkZC5pdC9wOXo1MjllZ3RnYmYxLnBuZxChAhiAASI+Ejphbm9ueW1vdXMuSW5uQ2FyZC52c3RhY2suenN0YWNrLTAudnN0YWNrLTEuaW1hZ2UtMy5vblByZXNzGgA6ATMiBAgAEAE6ATEiBAgAEAE6ATAiBAgAEAEiJBIgYW5vbnltb3VzLklubkNhcmQudnN0YWNrLm9uUHJlc3MaABCABIAAAAAPZ3JwYy1zdGF0dXM6MA0K
```
