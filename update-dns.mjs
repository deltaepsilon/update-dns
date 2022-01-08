import path from 'path';
import url from 'url';
import { DNS } from '@google-cloud/dns';
import axios from 'axios';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, 'service-account.json');

// Creates a client
const dns = new DNS();

async function updateDns(
  { name, zone } = { name: 'local.chrisesplin.com.', zone: 'chrisesplin-dot-com' },
) {
  const chrisesplinDotCom = dns.zone(zone);
  const [aRecords] = await chrisesplinDotCom.getRecords('A');
  const [aaaaRecords] = await chrisesplinDotCom.getRecords('AAAA');
  const aRecordIndex = aRecords.findIndex((record) => record.name === name);
  const aaaaRecordIndex = aaaaRecords.findIndex((record) => record.name === name);
  const updatedARecords = aRecords.slice(0);
  const updatedAAAARecords = aaaaRecords.slice(0);
  const { ipv4, ipv6 } = await getIPAddresses();

  updatedARecords.splice(
    aRecordIndex,
    1,
    chrisesplinDotCom.record('A', {
      name: 'local.chrisesplin.com.',
      type: 'A',
      ttl: 300,
      rrdatas: [ipv4],
      signatureRrdatas: [],
      kind: 'dns#resourceRecordSet',
      test: true,
    }),
  );

  updatedAAAARecords.splice(
    aaaaRecordIndex,
    1,
    chrisesplinDotCom.record('AAAA', {
      name: 'local.chrisesplin.com.',
      type: 'AAAA',
      ttl: 60,
      rrdatas: [ipv6],
      signatureRrdatas: [],
      kind: 'dns#resourceRecordSet',
    }),
  );

  const [, { additions: aAdditions, deletions: aDeletions }] =
    await chrisesplinDotCom.replaceRecords('A', updatedARecords);
  const [, { additions: aaaaAdditions, deletions: aaaaDeletions }] =
    await chrisesplinDotCom.replaceRecords('AAAA', updatedAAAARecords);

  console.info(JSON.stringify({ aAdditions, aDeletions, aaaaAdditions, aaaaDeletions }, null, 2));
}

async function getIPAddresses() {
  const ipv4res = await axios.get('https://api.ipify.org?format=json');
  const ipv6res = await axios.get('http://v6.ipv6-test.com/api/myip.php');
  const ipv4 = ipv4res.data.ip;
  const ipv6 = ipv6res.data;

  console.log(ipv6res.data);

  return { ipv4, ipv6 };
}

(async () => {
  await updateDns();
})();
