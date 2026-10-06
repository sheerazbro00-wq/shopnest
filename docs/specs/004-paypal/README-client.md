# Switching a store to real PayPal

ShopNest ships with PayPal in **simulated** mode, where no money moves. Use these steps to
connect a client's own PayPal account. The PayPal account must be a **Business** account
in a country PayPal supports.

## 1. Get the keys (client does this, or shares access)

1. Log in at <https://developer.paypal.com> with the client's PayPal Business account.
2. Go to **Apps & Credentials**. Choose **Sandbox** first; you'll repeat these steps for
   **Live** later.
3. **Create App** (type *Merchant*), then copy the **Client ID** and **Secret**.
4. Under **Testing Tools → Sandbox Accounts**, note the auto-created *Personal* test buyer
   (email + password). You'll use it to pay in step 3.

Ask for the keys through a password manager or a one-time secret link. Never send them by
chat or email.

## 2. Configure the API (Vercel → `shopnest-api` → Environment Variables)

| Variable | Sandbox test | Going live |
|---|---|---|
| `PAYPAL_MODE` | `sandbox` | `live` |
| `PAYPAL_CLIENT_ID` | sandbox Client ID | live Client ID |
| `PAYPAL_CLIENT_SECRET` | sandbox Secret — type **Secret** | live Secret — type **Secret** |
| `PAYPAL_USD_RATE` | Rs per US dollar, e.g. `280` | current rate |

Redeploy the API. If the keys are missing or wrong, PayPal disappears from checkout. The
Vercel log then explains why with a `[paypal] … not ready` line, without printing the keys.

## 3. Test with sandbox (≈15 minutes)

1. Place an order and choose **PayPal**. You should land on **PayPal's sandbox** page, not the
   yellow "TEST MODE" page.
2. Log in as the sandbox *Personal* buyer and approve.
3. Check the result:
   - You're back on the thank-you page, showing "Paid with PayPal · $X (Rs Y)".
   - The admin panel shows **PayPal**, with no "(test)" label, plus a transaction id.
   - The receipt and the owner alert each arrived once.
4. Refresh the thank-you page a few times. The PayPal sandbox dashboard should still show
   **one** payment.
5. Start another order and press **Cancel** on PayPal. You should be back at checkout with the
   form filled in and no email sent.

## 4. Go live

Swap in the **Live** Client ID and Secret, set `PAYPAL_MODE=live`, then redeploy. Make one
small real purchase and refund it from the PayPal dashboard.

## Notes

- PayPal charges in **USD**, using `PAYPAL_USD_RATE`. The shopper sees the dollar amount
  before paying, and the order stores both amounts.
- Refunds are made in the PayPal dashboard. Cancelling an order in ShopNest doesn't move
  money.
- No webhooks are needed. ShopNest takes the money when the shopper returns from PayPal. A
  shopper who approves and then closes the tab is **not** charged.
