import test from 'node:test';
import assert from 'node:assert/strict';
import { BUSINESS_PLANS, businessPrice, formatPrice, licenceEnquiryHref } from '../lib/pricing-options.mjs';

test('annual licence quotes apply 15% saving and show VAT only as a separate illustration', () => {
  const totals = BUSINESS_PLANS.map(plan => businessPrice(plan, 'annual'));
  assert.deepEqual(totals.map(p => p.billedPence), [80580, 202980, 406980]);
  assert.deepEqual(totals.map(p => p.futureVatInclusivePence), [96696, 243576, 488376]);
  assert.deepEqual(totals.map(p => formatPrice(p.monthlyEquivalentPence)), ['£67.15', '£169.15', '£339.15']);
  assert.deepEqual(BUSINESS_PLANS.map(plan => businessPrice(plan).billedPence), [7900, 19900, 39900]);
});

test('licence enquiry retains the selected band, billing and locale without starting checkout', () => {
  const url = new URL(licenceEnquiryHref('en', 'Scale business licence', 'annual', 'scale'), 'https://www.rpgexcellence.com');
  assert.equal(url.pathname, '/en/contact');
  assert.equal(url.searchParams.get('topic'), 'Pricing and subscription');
  assert.match(url.searchParams.get('message'), /Scale business licence\.\nNamed-user band: 21–50 users\.\nBilling preference: Annual\./);
  const enterprise = new URL(licenceEnquiryHref('pl', 'Enterprise', 'monthly', 'enterprise'), url);
  assert.equal(enterprise.pathname, '/pl/contact');
  assert.match(enterprise.searchParams.get('message'), /51\+ users \/ multiple organisations/);
});
