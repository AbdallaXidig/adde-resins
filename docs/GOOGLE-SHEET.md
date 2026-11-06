# Track every quotation in an online sheet

When the site is connected to a sheet, it adds one row for each of these:

| Type | When |
|---|---|
| **Cart quotation** | A customer fills in the short cart form and generates a quotation |
| **Cart order** | A customer submits the cart as an order |
| **RFQ form** | A customer sends the Request for Quotation form |
| **WhatsApp cart** | A customer taps **Send this cart on WhatsApp** (the chat itself happens in WhatsApp) |

Each row has these columns: date, reference, type, status, name, company, email, phone, country, port, items, total kg, subtotal, whether pricing is still needed, notes, language, the customer's quotation link and the admin link.

The database is still the main record. If the sheet is down, nothing is lost: open the order or RFQ in the admin and click **Send to sheet now**. Sending a request again updates its existing row, so it never creates a duplicate.

## Set it up with Google Sheets (free, about 5 minutes)

1. Create a new Google Sheet, for example *Adde International – Quotations*.
2. In the sheet, open **Extensions → Apps Script**. Delete the sample code and paste in everything from [`google-sheet.gs`](google-sheet.gs).
3. Make a long random secret, for example by running `openssl rand -hex 24` in a terminal. Put it in the script line `const SECRET = '...'`, then click **Save**.
4. Click **Deploy → New deployment**, set the type to **Web app**, and choose:
   - *Execute as:* **Me**
   - *Who has access:* **Anyone** (the secret is what protects the sheet)
5. Click **Deploy**, allow the permissions Google asks for, and copy the **Web app URL**. It ends in `/exec`.
6. On the website server, set these in `.env` (or in your host's environment settings), then restart the site:
   ```
   SHEET_WEBHOOK_URL="https://script.google.com/macros/s/XXXX/exec"
   SHEET_WEBHOOK_SECRET="the same secret as in the script"
   ```
7. Send a test quotation from the cart. A **Quotations** tab appears in the sheet, with a header row and your request in it. In the admin, that order's **Online sheet** panel shows **Sent**.

To share the sheet with your team, click **Share** in Google Sheets. You can download it at any time with **File → Download → Microsoft Excel (.xlsx)**.

If you change the script later, use **Deploy → Manage deployments → Edit → New version**. That keeps the same URL.

## Using Microsoft Excel Online instead

The site sends a plain JSON POST, so any service that accepts one can receive it. With **Power Automate**:

1. Create a flow with the trigger **When an HTTP request is received**.
2. Add the action **Excel Online → Add a row into a table**. Map `row.Reference`, `row.Name` and the other fields to your table's columns.
3. Put the flow's URL in `SHEET_WEBHOOK_URL`. Check `secret` in a condition step so the flow ignores requests without your secret.

Note that the HTTP trigger needs a Power Automate premium licence.

The JSON looks like this:
```json
{ "secret": "…", "headers": ["Received", "Reference", "…"], "row": { "Received": "2026-11-06 10:42 UTC", "Reference": "ADI-ORD-2026-00001", "Type": "Cart quotation", "Name": "…" } }
```

## Troubleshooting

| Admin shows | Fix |
|---|---|
| *Sheet returned a web page* | The web app access isn't set to **Anyone**. Redeploy with **Anyone**. |
| *Wrong secret* | The secret in the script and `SHEET_WEBHOOK_SECRET` don't match. |
| *HTTP 404* | The URL is wrong, or the deployment was deleted. Copy the `/exec` URL again. |
