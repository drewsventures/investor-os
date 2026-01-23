/**
 * Import Syndicate CSV Data
 * Run with: npx ts-node scripts/import-syndicate.ts
 */

const csvData = `Startup Name,Invest Date,Fund Legal Name,Stage,Market,Type,Asset Type,Share Class,Pro Rata Rights,Invested Amount (excl. fees),Discount,Round Size,Valuation or Cap,Valuation Type,Valuation Updated Date,Realized Value,Unrealized Value,Paid PPS,Current PPS,Number of Shares,Number of LPs
SuperRare,09/25/20,"SU Fund I, a series of Red Beard VC, LP",Seed,Blockchain / Crypto,SPV,Equity Round,,Yes,"$80,266.40",-,"$1,400,000.00","$6,000,000.00",-,02/25/24,"$207,637.78","$831,110.06",$0,$0,"2,763,653.00",37
AltoIRA,10/29/20,"AL Fund I, a series of Red Beard VC, LP",Seed+,Investment Platforms,SPV,Equity Round,,Yes,"$99,999.56",-,"$2,900,000.00","$25,500,000.00",post-money,12/16/21,$0.00,"$612,442.87",$0.74,$4.56,"134,343.00",36
RoboTire (YC W20),11/30/20,"RO Fund I, a series of Red Beard VC, LP",Seed+,Robotics,SPV,SAFE,,Yes,"$57,867.00",10.00%,"$1,500,000.00","$25,000,000.00",post-money,11/10/23,$0.00,"$64,295.47",$0,$0,"46,808.00",27
Noah,12/15/20,"NO Fund I, a series of Red Beard VC, LP",Series A+,Real Estate,SPV,Equity Round,,Yes,"$762,592.66",-,"$3,000,000.00","$29,000,000.00",-,10/15/23,$0.00,$0.00,$1.11,$0,-,170
Dapper Labs,02/09/21,"DA Fund I, a series of Red Beard VC, LP",Other,Blockchain / Crypto,SPV,Convertible Debt,,Yes,"$500,000.00",25.00%,"$50,000,000.00","$990,000,000.00",-,04/01/22,$0.00,"$3,204,943.23",$24.54,$157.01,"20,412.00",84
STUDIO,02/09/21,"ST Fund I, a series of Red Beard VC, LP",Seed+,Fitness,SPV,Convertible Debt,,Yes,"$90,700.00",-,"$1,000,000.00","$23,600,000.00",-,02/09/21,$0.00,"$90,700.00",$0,$0,-,40
Holler,02/17/21,"HO Fund I, a series of Red Beard VC, LP",Series B,Social,SPV,Equity Round,,Yes,"$829,840.00",-,"$10,000,000.00","$90,000,000.00",-,01/27/24,$0.00,"$206,199.82",$0,$0,"3,345.00",205
AltoIRA,04/07/21,"AL Fund II, a series of Red Beard VC, LP",Series A,Investment Platforms,SPV,Equity Round,,Yes,"$58,410.03",-,"$16,000,000.00","$74,000,000.00",-,12/16/21,$0.00,"$170,056.92",$1.57,$4.56,"37,303.00",20
Genies,04/16/21,"GE Fund I, a series of Red Beard VC, LP",Series A,Blockchain / Crypto,SPV,Equity Round,,Yes,"$999,995.10",-,"$50,000,000.00","$350,000,000.00",-,05/12/22,$0.00,"$1,926,729.94",$8.71,$16.78,"114,810.00",132
Reactive,04/22/21,"RE Fund I, a series of Red Beard VC, LP",Seed,SaaS,SPV,SAFE,,Yes,"$299,999.86",-,"$1,500,000.00","$5,500,000.00",post-money,04/22/21,$0.00,"$299,999.86",$0,$0,-,107
SuperRare,05/05/21,"SU Fund II, a series of Red Beard VC, LP",Series A,Blockchain / Crypto,SPV,Equity Round,,Yes,"$199,998.03",-,"$8,000,000.00","$80,000,000.00",-,02/25/24,"$53,696.94","$214,933.18",$0,$0,"714,708.00",50
Opolis,05/06/21,"OP Fund I, a series of Red Beard VC, LP",Seed+,Blockchain / Crypto,SPV,Equity Round,common,No,"$276,700.00",-,"$5,000,000.00","$25,000,000.00",pre-money,05/06/21,$0.00,"$276,700.10",$2.50,$2.50,"110,680.00",95
LVL,05/13/21,"LV Fund I, a series of Red Beard VC, LP",Seed+,Blockchain / Crypto,SPV,SAFE,,Yes,"$683,772.00",20.00%,"$1,500,000.00","$18,000,000.00",pre-money,10/22/23,$0.00,$0.00,$2.06,$0,-,193
RoboTire (YC W20),06/03/21,"RO Fund II, a series of Red Beard VC, LP",Series A,Robotics,SPV,Equity Round,,Yes,"$250,000.70",-,"$7,500,000.00","$20,000,000.00",-,06/03/21,$0.00,"$250,000.03",$1.37,$1.37,"182,004.00",68
Venus Aerospace,06/07/21,"VE Fund I, a series of Red Beard VC, LP",Seed+,Aerospace,SPV,SAFE,,No,"$340,878.00",20.00%,"$5,000,000.00","$25,000,000.00",post-money,05/22/23,$0.00,"$1,458,254.63",$1.11,$4.76,"306,517.00",124
Oasis,06/07/21,"OA Fund I, a series of Red Beard VC, LP",Seed+,VR / AR,SPV,SAFE,,No,"$557,858.00",10.00%,"$5,000,000.00","$65,000,000.00",pre-money,07/22/23,$0.00,"$89,750.73",$0,$0.77,"116,092.00",131
SuperWorld,06/24/21,"SUP Fund I, a series of Red Beard VC, LP",Seed,VR / AR,SPV,SAFE,,Yes,"$423,740.00",0.00%,"$2,000,000.00","$30,000,000.00",pre-money,10/01/22,$0.00,"$423,740.00",$0,$0,-,109
Azteco,06/25/21,"AZ Fund I, a series of Red Beard VC, LP",Seed,Blockchain / Crypto,SPV,SAFE,,Yes,"$182,372.99",0.00%,"$2,000,000.00","$10,000,000.00",post-money,06/25/21,$0.00,"$182,372.99",$0,$0,-,40
Teleportal,06/29/21,"TE Fund I, a series of Red Beard VC, LP",Seed,VR / AR,SPV,Equity Round,preferred,No,"$310,500.00",-,"$2,000,000.00","$8,000,000.00",post-money,10/04/23,$0.00,$0.00,$0,$0,-,36
Hermes Robotics (YC W21),07/05/21,"HE Fund I, a series of Red Beard VC, LP",Seed,Robotics,SPV,Equity Round,,Yes,"$279,999.82",-,"$5,000,000.00","$20,000,000.00",-,07/05/21,$0.00,"$279,999.82",$0,$0,-,108
MoneyMade,07/05/21,"MO Fund I, a series of Red Beard VC, LP",Seed,Investment Platforms,SPV,Equity Round,preferred,-,"$153,500.00",-,"$2,750,000.00","$13,250,000.00",post-money,07/05/21,$0.00,"$153,500.00",$0.75,$0.75,"203,851.00",46
Zed Run,07/21/21,"ZE Fund II, a series of Red Beard VC, LP",Series A,Gaming,SPV,Equity Round,preferred,Yes,"$1,000,000.00",-,"$20,000,000.00","$80,000,000.00",pre-money,02/25/24,$0.00,"$2,560,343.34",$0,$0,"3,629,292.00",212
Epic Kitchens,07/27/21,"EP Fund I, a series of Red Beard VC, LP",Seed+,Food / Beverages,SPV,Equity Round,preferred,No,"$112,280.00",-,"$5,500,000.00","$13,000,000.00",pre-money,11/24/22,$0.00,$0.00,$6.79,$0,-,54
Veremark,08/03/21,"VER Fund I, a series of Red Beard VC, LP",Seed,HR & Recruiting,SPV,Equity Round,preferred,-,"$100,000.00",-,"$2,800,000.00","$8,500,000.00",pre-money,05/10/22,$0.00,"$207,311.11",£1.55,£3.52,"46,451.00",35
Roll,08/17/21,"ROL Fund I, a series of Red Beard VC, LP",Series A,Blockchain / Crypto,SPV,Equity Round,preferred,-,"$349,999.88",-,"$10,000,000.00","$40,000,000.00",pre-money,03/25/22,$0.00,"$349,999.87",$1.59,$1.59,"219,656.00",84
Parcel,08/26/21,"PA Fund I, a series of Red Beard VC, LP",Seed,Blockchain / Crypto,SPV,Equity Round,preferred,-,"$250,000.00",-,"$2,000,000.00","$15,000,000.00",post-money,11/12/21,$0.00,"$250,000.00",$0,$0,-,134
GreenPark Sports,08/27/21,"GR Fund I, a series of Red Beard VC, LP",Series A,Social,SPV,Equity Round,preferred,-,"$498,348.39",-,"$30,000,000.00","$115,000,000.00",pre-money,08/28/21,$0.00,"$498,351.98",$6.93,$6.93,"71,905.00",106
nameless,09/01/21,"NA Fund I, a series of Red Beard VC, LP",Seed,Blockchain / Crypto,SPV,SAFE,,Yes,"$1,260,000.00",0.00%,"$12,000,000.00","$72,000,000.00",post-money,09/01/21,$0.00,"$1,260,000.00",$0,$0,-,200
Alethea Ai,09/01/21,"ALI 140, a series of SAX Capital Series Fund III, LP",Other,Blockchain / Crypto,SPV,SAFT,,No,"$750,000.00",-,"$16,000,000.00",uncapped,-,02/25/24,$0.00,"$2,905,400.00",$0,$0.05,"62,500,000.00",74
Calaxy,09/01/21,"CAL Fund I, a series of SAX Capital Series Fund III, LP",Seed,Blockchain / Crypto,SPV,SAFE,,No,"$441,171.42",20.00%,"$6,000,000.00",uncapped,post-money,09/01/21,$0.00,"$441,171.42",$0,$0,-,91
round21,09/08/21,"ROU Fund I, a series of Red Beard VC, LP",Seed,Consumer Product,SPV,SAFE,preferred,Yes,"$197,946.00",-,"$1,250,000.00","$6,250,000.00",post-money,09/08/21,$0.00,"$197,946.00",$0,$0,-,56
Stardust,09/13/21,"STR 130, a series of SAX Capital Series Fund III, LP",Other,Blockchain / Crypto,SPV,Equity Round,preferred,No,"$270,000.00",-,"$270,000.00","$25,000,000.00",post-money,11/30/22,$0.00,"$1,104,748.79",$1.16,$4.74,"232,919.00",66
Indoor Robotics,09/14/21,"IN Fund I, a series of Red Beard VC, LP",Series A+,Drones,SPV,SAFE,,-,"$100,000.00",15.00%,"$4,800,000.00","$25,000,000.00",pre-money,04/26/22,$0.00,"$135,892.89",$14.42,$19.59,"6,936.00",46
Agoric,09/16/21,"AGO 150, a series of SAX Capital Series Fund III, LP",Other,Blockchain / Crypto,SPV,Equity Round,preferred,-,"$600,000.00",-,"$250,000.00","$400,000,000.00",post-money,02/25/24,$0.00,"$240,320.55",$0,$0.18,"1,500,000.00",48
Layer3,09/28/21,"LA Fund I, a series of Red Beard VC, LP",Pre-Seed,Blockchain / Crypto,SPV,SAFE,,-,"$100,100.00",-,"$2,500,000.00","$15,000,000.00",post-money,09/28/21,$0.00,"$100,000.00",$0,$0,-,34
Zed Run,09/29/21,"ZE Fund II, a series of SAX Capital Series Fund III, LP",Other,Gaming,SPV,Equity Round,preferred,No,"$119,364.90",-,"$119,364.00","$100,000,000.00",post-money,09/29/21,$0.00,"$119,364.00",$9.78,$9.78,"12,205.00",9
Macroverse,09/30/21,"MA Fund I, a series of Red Beard VC, LP",Seed+,Media / Entertainment,SPV,SAFE,,Yes,"$202,005.00",-,"$250,000.00","$8,000,000.00",pre-money,09/30/21,$0.00,"$202,005.00",$0,$0,-,53
GigLabs,10/04/21,"GI Fund I, a series of Red Beard VC, LP",Series A,Blockchain / Crypto,SPV,Convertible Debt,,-,"$326,570.00",10.00%,"$3,000,000.00","$30,000,000.00",-,10/04/21,$0.00,"$326,570.00",$0,$0,-,121
Concept Art House,10/07/21,"CO Fund I, a series of Red Beard VC, LP",Series A,Blockchain / Crypto,SPV,Equity Round,preferred,No,"$464,995.34",-,"$20,000,000.00","$120,000,000.00",post-money,08/21/22,$0.00,"$464,995.34",$6.10,$6.10,"76,215.00",62
Auroboros,10/12/21,"AU Fund I, a series of Red Beard VC, LP",Seed,Blockchain / Crypto,SPV,SAFE,,-,"$250,000.00",20.00%,"$1,500,000.00","$10,000,000.00",pre-money,10/12/21,$0.00,"$250,000.00",$0,$0,-,51
Basic Space,10/15/21,"BA Fund I, a series of Red Beard VC, LP",Series A+,Blockchain / Crypto,SPV,SAFE,,Yes,"$141,973.00",15.00%,"$5,000,000.00","$100,000,000.00",post-money,08/31/23,$0.00,"$191,658.13",$4.79,$6.46,"29,651.00",58
Maidbot,10/18/21,"MAI Fund I, a series of Red Beard VC, LP",Series B,Robotics,SPV,Equity Round,preferred,-,"$125,442.03",-,"$8,000,000.00","$45,500,000.00",post-money,11/29/22,$0.00,"$125,442.03",$2.23,$2.23,"56,299.00",39
Oorbit,10/25/21,"OO Fund I, a series of Red Beard VC, LP",Seed,Gaming,SPV,Equity Round,preferred,Yes,"$138,685.00",-,"$2,000,000.00","$8,000,000.00",post-money,01/23/23,$0.00,"$816,662.76",$3.12,$3.12,"261,399.00",60
Gather,10/27/21,"GA Fund I, a series of Red Beard VC, LP",Series A,Blockchain / Crypto,SPV,Equity Round,preferred,-,"$128,934.00",-,"$5,000,000.00","$40,000,000.00",post-money,10/26/21,$0.00,"$128,934.00",$800.83,$800.83,161,65
Blockade Games,10/28/21,"BL Fund I, a series of Red Beard VC, LP",Seed+,Blockchain / Crypto,SPV,Equity Round,preferred,-,"$408,000.00",-,"$5,000,000.00","$23,000,000.00",pre-money,10/27/21,$0.00,"$408,000.00",$19.74,$19.74,"20,668.00",86
Fan Controlled Football,10/28/21,"FA Fund I, a series of Red Beard VC, LP",Series A,Media / Entertainment,SPV,SAFE,,-,"$606,922.00",20.00%,"$5,000,000.00","$85,000,000.00",pre-money,12/15/22,$0.00,"$1,230,911.80",$3.15,$6.38,"192,794.00",91
Due Dilly,11/05/21,"DU Fund I, a series of Red Beard VC, LP",Pre-Seed,Consumer Product,SPV,SAFE,,-,"$564,357.00",10.00%,"$1,500,000.00","$10,000,000.00",post-money,04/06/23,"$523,844.62","$31,745.08",$0,$0,-,76
HeroMaker,11/08/21,"HER Fund I, a series of Red Beard VC, LP",Seed,Media / Entertainment,SPV,Equity Round,common,Yes,"$555,990.00",-,"$4,000,000.00","$8,000,000.00",pre-money,11/08/21,$0.00,"$555,990.00",$1,$1,"555,990.00",55
The Sandbox,11/09/21,"TH Fund I, a series of Red Beard VC, LP",Series B,Gaming,SPV,Equity Round,preferred,-,"$999,967.26",-,"$50,000,000.00","$500,000,000.00",pre-money,11/09/21,$0.00,"$999,967.26",$46.91,$46.91,"21,315.00",193
Atlas Reality,11/12/21,"CE Gaingels Fund I, a series of Red Beard VC, LP",Seed+,Gaming,SPV,SAFE,,No,"$100,000.00",20.00%,"$1,500,000.00","$40,000,000.00",post-money,11/12/21,$0.00,"$100,000.00",$0,$0,-,36
Gilded,11/17/21,"GIL Fund I, a series of Red Beard VC, LP",Seed,Blockchain / Crypto,SPV,Equity Round,preferred,-,"$200,000.00",-,"$3,250,000.00","$10,375,000.00",pre-money,02/01/24,"$14,095.37",$0.00,$0.64,$0,-,65
Azarus,11/18/21,"AZA Fund I, a series of Red Beard VC, LP",Seed+,Media / Entertainment,SPV,Convertible Debt,,-,"$315,005.00",15.00%,"$2,000,000.00","$20,000,000.00",-,02/17/24,$0.00,"$809,207.85",$0.15,$0.60,"1,063,105.00",46
Dfns,11/22/21,"DF Fund I, a series of Red Beard VC, LP",Seed,Blockchain / Crypto,SPV,Equity Round,preferred,-,"$338,066.09",-,"$5,000,000.00","EUR€22,000,000.00",pre-money,07/28/23,$0.00,"$362,035.79",€163.62,€182.18,"1,834.00",87
Wilder World,11/29/21,"WLD 134, a series of SAX Capital Series Fund III, LP",Other,Blockchain / Crypto,SPV,Equity Round,common,No,"$1,000,000.00",-,"$1,000,000.00","$24,000,000.00",post-money,02/25/24,$0.00,"$1,276,702.87",$0.05,$0.38,"3,333,333.00",99
Uplandme,12/02/21,"ULM 174, a series of SAX Capital Series Fund III, LP",Other,Blockchain / Crypto,SPV,Equity Round,common,No,"$276,013.85",-,"$12,000,000.00","$270,000,000.00",post-money,12/02/21,$0.00,"$276,013.86",$28.62,$28.62,"9,645.00",79
That App,12/06/21,"THA Fund I, a series of Red Beard VC, LP",Seed,Blockchain / Crypto,SPV,Equity Round,preferred,-,"$249,998.28",-,"$3,000,000.00","$15,000,000.00",post-money,01/27/24,"$126,325.24",$0.00,$2.06,$0,-,74
Noah,12/15/21,"NO Fund II, a series of Red Beard VC, LP",Series A+,Real Estate,SPV,Convertible Debt,preferred,-,"$300,000.00",-,"$4,000,000.00","$40,000,000.00",-,10/15/23,$0.00,$0.00,$0,$0,-,70
Emerge,12/16/21,"EM Fund I, a series of Red Beard VC, LP",Series A,VR / AR,SPV,SAFE,,-,"$244,000.00",-,"$5,000,000.00","$50,000,000.00",pre-money,02/21/23,$0.00,"$248,882.77",$2.32,$2.36,"105,267.00",68
Aunt Flow,12/18/21,"AUN Fund I, a series of Red Beard VC, LP",Series A,Health,SPV,Equity Round,preferred,No,"$87,150.00",-,"$3,500,000.00","$30,000,000.00",pre-money,12/29/22,$0.00,"$86,460.08",$2.04,$2.03,"42,650.00",39
AltoIRA,12/20/21,"AL Fund III, a series of Red Beard VC, LP",Series B,Investment Platforms,SPV,Equity Round,preferred,-,"$200,000.00",-,"$35,000,000.00","$270,000,000.00",pre-money,12/21/21,$0.00,"$199,999.11",$4.56,$4.56,"43,871.00",54
MetaMundo,01/03/22,"ME Fund I, a series of Red Beard VC, LP",Seed,Blockchain / Crypto,SPV,SAFE,,-,"$100,010.00",-,"$2,600,000.00","$25,500,000.00",post-money,01/03/22,$0.00,"$100,000.00",$0,$0,-,49
Proof of Attendance Protocol,01/04/22,"PR Fund I, a series of Red Beard VC, LP",Seed,Blockchain / Crypto,SPV,Equity Round,preferred,-,"$500,546.50",-,"$8,000,000.00","$55,000,000.00",pre-money,10/01/22,$0.00,"$500,546.50",$4.57,$4.57,"109,538.00",127
3Box Labs,01/11/22,"CE Fund I, a series of Red Beard VC, LP",Series A,Blockchain / Crypto,SPV,Equity Round,preferred,-,"$250,235.52",-,"$30,000,000.00","$120,000,000.00",pre-money,09/18/23,$0.00,"$250,235.52",$58.41,$58.41,"4,280.00",89
CryptoSlam,01/13/22,"CR Fund I, a series of Red Beard VC, LP",Seed,Blockchain / Crypto,SPV,Equity Round,preferred,No,"$527,999.32",-,"$9,200,000.00","$51,550,000.00",post-money,01/13/22,$0.00,"$527,999.50",$3.59,$3.59,"147,157.00",142
VatnFörn (DeepWaters),01/14/22,"DE Gaingels Fund I, a series of Red Beard VC, LP",Seed,Blockchain / Crypto,SPV,SAFE,preferred,No,"$252,000.00",25.00%,"$5,000,000.00",uncapped,pre-money,01/14/22,$0.00,"$252,000.00",$0,$0,-,61
Humane Genomics,01/17/22,"HU Fund I, a series of Red Beard VC, LP",Seed,Biotech,SPV,SAFE,,-,"$169,000.00",-,"$3,000,000.00","$20,000,000.00",post-money,01/17/22,$0.00,"$169,000.00",$0,$0,-,56
Glow Labs,01/19/22,"GL Fund I, a series of Red Beard VC, LP",Seed,Blockchain / Crypto,SPV,SAFE,preferred,-,"$100,000.00",-,"$4,250,000.00","$20,000,000.00",post-money,01/19/22,$0.00,"$100,000.00",$0,$0,-,28
Swoops,01/31/22,"MET Fund I, a series of Red Beard VC, LP",Pre-Seed,Media / Entertainment,SPV,Equity Round,preferred,Yes,"$400,003.15",-,"$3,000,000.00","$12,000,000.00",post-money,01/31/22,$0.00,"$400,003.15",$0.90,$0.90,"446,455.00",107
Tilt Five,02/08/22,"TI Fund I, a series of Red Beard VC, LP",Series A+,VR / AR,SPV,Convertible Debt,,-,"$52,180.00",15.00%,"$3,000,000.00","$35,000,000.00",-,02/08/22,$0.00,"$52,180.00",$0,$0,-,29
FungyProof,02/16/22,"FU Fund I, a series of Red Beard VC, LP",Pre-Seed,Blockchain / Crypto,SPV,SAFE,preferred,No,"$178,561.00",15.00%,"$500,000.00","$5,500,000.00",pre-money,02/16/22,$0.00,"$178,561.00",$0,$0,-,26
SeaSats,02/18/22,"SE Fund I, a series of Red Beard VC, LP",Pre-Seed,AI / ML,SPV,SAFE,,Yes,"$72,000.00",20.00%,"$1,000,000.00","$10,000,000.00",post-money,09/19/23,$0.00,"$220,906.46",$1.60,$4.90,"45,129.00",23
Sudrania,02/22/22,"SUD Fund I, a series of Red Beard VC, LP",Series A,Finance,SPV,Convertible Debt,,-,"$165,500.00",15.00%,"$1,500,000.00","$140,000,000.00",-,02/22/22,$0.00,"$165,500.00",$0,$0,-,36
Stationhead,02/24/22,"STA Fund I, a series of Red Beard VC, LP",Seed,Media / Entertainment,SPV,Equity Round,preferred,Yes,"$145,483.25",-,"$5,000,000.00","$45,000,000.00",pre-money,02/24/22,$0.00,"$145,483.25",$2.19,$2.19,"66,381.00",30
Neupeak,03/10/22,"NE Fund I, a series of Red Beard VC, LP",Seed,Robotics,SPV,Equity Round,preferred,-,"$75,226.01",-,"$2,000,000.00","CAD$6,000,000.00",pre-money,03/13/23,$0.00,"$96,109.06",C$0.45409,$0.45,"211,652.00",22
Setscale,03/14/22,"FL Fund I, a series of Red Beard VC, LP",Seed,Finance,SPV,Convertible Debt,,-,"$365,000.00",10.00%,"$15,000,000.00","$150,000,000.00",-,03/14/22,$0.00,"$365,000.00",$0,$0,-,82
Azuro,03/15/22,"AZU 216, a series of SAX Capital Series Fund III, LP",Seed+,Blockchain / Crypto,SPV,SAFT,,No,"$637,417.39",36.00%,"$3,000,000.00","$95,000,000.00",post-money,03/15/22,$0.00,"$637,407.39",$0,$0,-,65
Upstream,03/25/22,"UP Fund I, a series of Red Beard VC, LP",Series A,Social,SPV,Equity Round,preferred,No,"$472,199.58",-,"$12,000,000.00","$80,000,000.00",post-money,03/25/22,$0.00,"$472,199.58",$1.16,$1.16,"407,828.00",139
Terran Biosciences,03/28/22,"TER Fund I, a series of Red Beard VC, LP",Series B,Biotech,SPV,Equity Round,preferred,No,"$92,864.00",-,"$50,000,000.00","$500,000,000.00",pre-money,03/28/22,$0.00,"$92,864.00",$16,$16,"5,804.00",24
iRocket,03/31/22,"IR Fund I, a series of Red Beard VC, LP",Seed,Aerospace,SPV,SAFE,,Yes,"$146,000.00",-,"$10,000,000.00","$107,500,000.00",post-money,03/31/22,$0.00,"$146,000.00",$0,$0,-,31
Atmos Labs,04/08/22,"ATS 218, a series of SAX Capital Series Fund III, LP",Seed,Gaming,SPV,SAFE,preferred,No,"$500,000.00",-,"$7,500,000.00","$35,000,000.00",pre-money,05/23/22,$0.00,"$500,000.00",$0,$0,-,54
WAGMI United,04/14/22,"WA Fund I, a series of Red Beard VC, LP",Seed,Blockchain / Crypto,SPV,Equity Round,preferred,-,"$500,000.00",-,"$20,000,000.00","$26,666,000.00",post-money,04/14/22,$0.00,"$500,000.06",$26.67,$26.67,"18,750.00",174
Flowty,04/14/22,"FL Fund I, a series of Red Beard Ventures Syndicates, LP",Seed,Blockchain / Crypto,SPV,SAFE,,Yes,"$100,000.00",15.00%,"$5,000,000.00","$30,000,000.00",post-money,04/15/22,$0.00,"$100,000.00",$0,$0,-,24
Unstoppable Domains,04/21/22,"UN Fund I, a series of Red Beard VC, LP",Series A,Blockchain / Crypto,SPV,Equity Round,preferred,-,"$1,000,000.00",-,"$60,000,000.00","$1,000,000,000.00",post-money,04/22/22,$0.00,"$999,990.97",$46.13,$46.13,"21,678.00",157
Limewire,04/22/22,"LI Fund I, a series of Red Beard Ventures Syndicates, LP",Other,Media / Entertainment,SPV,SAFT,,-,"$500,010.00",-,"$7,200,000.00","$60,000,000.00",post-money,04/22/22,$0.00,"$500,000.00",$0,$0,-,145
AngelList,05/06/22,"AN Fund I, a series of Red Beard VC, LP",Other,Investment Platforms,SPV,Equity Round,common,-,"$388,674.81",-,"$100,000,000.00","$4,000,000,000.00",pre-money,08/26/22,$0.00,"$388,674.81",$39.79,$39.79,"9,769.00",83
Indoor Robotics,05/10/22,"IN Fund II, a series of Red Beard VC, LP",Series A,Drones,SPV,Equity Round,preferred,-,"$111,600.00",-,"$15,000,000.00","$42,000,000.00",pre-money,05/11/22,$0.00,"$110,775.43",$19.74,$19.59,"5,654.00",23
One of None,05/18/22,"ON Fund I, a series of Red Beard VC, LP",Pre-Seed,Blockchain / Crypto,SPV,SAFE,preferred,-,"$173,500.00",-,"$2,000,000.00","$10,000,000.00",post-money,01/27/24,$0.00,"$173,410.91",$1.73,$1.73,"100,064.00",32
Genies,05/27/22,"GE Fund II, a series of Red Beard VC, LP",Series C,Blockchain / Crypto,SPV,Equity Round,preferred,-,"$747,255.00",-,"$150,000,000.00","$1,000,000,000.00",post-money,05/28/22,$0.00,"$747,247.66",$16.78,$16.78,"44,527.00",98
Paradromics,06/13/22,"PA Fund I, a series of Red Beard Ventures Syndicates, LP",Seed+,Medical Devices,SPV,Convertible Debt,,-,"$51,600.00",20.00%,"$10,000,000.00","$120,000,000.00",-,03/14/23,$0.00,"$68,160.41",$0.27,$0.34,"200,992.00",23
AKKO,06/15/22,"AK Fund I, a series of Red Beard VC, LP",Series A,Insurance,SPV,Equity Round,preferred,-,"$41,892.71",-,"$15,000,000.00","$75,000,000.00",post-money,10/01/22,$0.00,"$41,892.71",$3.98,$3.98,"10,514.00",13
VatnFörn (DeepWaters),07/12/22,"VA Fund II, a series of Red Beard Ventures Syndicates, LP",Seed+,Blockchain / Crypto,SPV,SAFE,,Yes,"$147,452.36",10.00%,"$5,000,000.00","$40,000,000.00",pre-money,02/22/24,$0.00,"$147,452.36",$0,$0,-,34
Offbeat,07/13/22,"OF Fund I, a series of Red Beard Ventures Syndicate, LP",Seed+,Media / Entertainment,SPV,SAFE,,-,"$95,750.00",-,"$2,000,000.00","$45,000,000.00",post-money,07/13/22,$0.00,"$95,750.00",$0,$0,-,29
Veremark,07/14/22,"VER Fund II, a series of Red Beard Ventures Syndicates, LP",Series A,HR & Recruiting,SPV,Equity Round,common,-,"$96,095.75",-,"$7,500,000.00","$27,500,000.00",pre-money,07/13/22,$0.00,"$102,805.35",£3.52,£3.52,"23,035.00",32
Toka,07/14/22,"TO Fund I, a series of Red Beard VC, LP",Series A+,Security,SPV,SAFE,,-,"$166,550.00",20.00%,"$15,000,000.00","$95,000,000.00",pre-money,08/31/23,$0.00,"$208,187.27",$2.46,$3.07,"67,723.00",57
Aunt Flow,08/12/22,"AUN Fund II, a series of Red Beard VC, LP",Series A+,Health,SPV,SAFE,,Yes,"$53,491.20",20.00%,"$9,000,000.00","$80,000,000.00",pre-money,12/29/22,$0.00,"$86,460.08",$2.04,$2.03,"42,650.00",24
ZERO,08/29/22,"ZER Fund I, a series of Red Beard VC, LP",Other,Blockchain / Crypto,SPV,Equity Round,common,-,"$246,548.28",-,"$3,000,000.00","$100,000,000.00",pre-money,02/25/24,$0.00,"$1,391,074.38",$0.01,$0.06,"24,178,511.00",62
Cub3,08/31/22,"CU Fund I, a series of Red Beard VC, LP",Series A,Blockchain / Crypto,SPV,Equity Round,preferred,-,"$80,000.00",-,"$6,500,000.00","$28,000,000.00",pre-money,09/26/22,$0.00,"$80,020.07",$0.28,$0.28,"284,142.00",32
Shardeum,09/14/22,"SH Fund I, a series of Red Beard Ventures Syndicates, LP",Seed,Blockchain / Crypto,SPV,SAFT,,No,"$111,600.00",-,"$18,288,000.00","$199,136,000.00",post-money,09/14/22,$0.00,"$111,600.00",$0,$0,-,21
LayerZero Labs,09/22/22,"LA Fund I, a series of Red Beard Ventures Syndicates, LP",Series B,Blockchain / Crypto,SPV,Equity Round,preferred,No,"$433,642.78",-,"$60,000,000.00","$3,000,000,000.00",post-money,02/22/24,$0.00,"$433,642.78",$39.35,$39.35,"11,020.00",100
Firehawk Aerospace,10/17/22,"FI Fund I, a series of Red Beard VC, LP",Series A+,Aerospace,SPV,Equity Round,preferred,-,"$146,497.98",-,"$17,000,000.00","$50,000,000.00",pre-money,10/17/22,$0.00,"$146,497.98",$3.21,$3.21,"45,638.00",11
Bunch,10/21/22,"BU Fund I, a series of Red Beard Ventures Syndicates, LP",Series A,Social,SPV,SAFE,,-,"$102,343.90",-,"$7,000,000.00","$65,050,000.00",post-money,10/21/22,$0.00,"$102,343.90",$0,$0,-,33
RoboTire (YC W20),11/04/22,"RO Fund III, a series of Red Beard Ventures Syndicates, LP",Series A+,Robotics,SPV,Convertible Debt,,-,"$36,365.00",0.00%,"$8,000,000.00","$70,000,000.00",-,11/04/22,$0.00,"$36,365.00",$0,$0,-,20
GigLabs,11/04/22,"GI Fund II, a series of Red Beard Ventures Syndicates, LP",Series A,Blockchain / Crypto,SPV,Convertible Debt,,-,"$44,100.00",10.00%,"$8,000,000.00","$60,000,000.00",-,11/04/22,$0.00,"$44,100.00",$0,$0,-,23
Belay,02/16/23,"BEL FUND I, a series of Red Beard Ventures Syndicates, LP",Seed,Insurance,SPV,Equity Round,preferred,-,"$22,306.84",-,"$4,500,000.00","$14,500,000.00",post-money,02/16/23,$0.00,"$22,306.84",$0.95,$0.95,"56,700.00",27
Fireside,03/01/23,"FIR Fund I, a series of Red Beard VC, LP",Series A,Media / Entertainment,SPV,Equity Round,preferred,-,"$168,110.22",-,"$25,000,000.00","$138,200,000.00",post-money,08/06/23,$0.00,"$168,110.22",$3.15,$3.15,"53,348.00",39
Emerge,03/29/23,"EM-0113 Fund II, a series of Red Beard Ventures Syndicates, LP",Series B,VR / AR,SPV,Equity Round,preferred,No,"$57,311.48",-,"$20,000,000.00","$51,000,000.00",pre-money,03/29/23,$0.00,"$57,311.47",$2.36,$2.36,"38,434.00",33
Knights of Degen,05/03/23,"KNI Fund I, a series of Red Beard VC, LP",Pre-Seed,Media / Entertainment,SPV,Equity Round,preferred,Yes,"$226,556.56",-,"$4,000,000.00","$16,000,000.00",pre-money,05/03/23,$0.00,"$226,706.78",$2.14,$0,-,54
Toka,05/18/23,"TO-0316 Fund I, a series of Red Beard Ventures Syndicates, LP",Series B+,Security,SPV,Equity Round,preferred,-,"$59,326.71",-,"$25,000,000.00","$126,200,000.00",post-money,05/18/23,$0.00,"$59,326.98",$3.07,$3.07,"42,157.00",35
Pathway AI,07/14/23,"PA-0608 Fund I, a series of Red Beard Ventures Syndicates, LP",Pre-Seed,AI / ML,SPV,SAFE,,No,"$61,850.21",0.00%,"$810,000.00","$6,000,000.00",post-money,09/18/23,$0.00,"$59,009.73",£5.3333,£5.3333,"14,681.00",19
bitsCrunch,07/18/23,"BI Fund I, a series of Red Beard Ventures Syndicates, LP",Seed,Blockchain / Crypto,SPV,SAFT,common,No,"$164,219.88",-,"$2,000,000.00","$80,000,000.00",post-money,05/31/23,$0.00,"$164,219.88",$0,$0,-,19
Oasis,08/02/23,"OA-0622 Fund II, a series of Red Beard Ventures Syndicates, LP",Seed,AI / ML,SPV,Equity Round,preferred,No,"$61,470.91",-,"$4,000,000.00","$14,000,000.00",post-money,10/20/23,$0.00,"$61,470.91",$0.77,$0.77,"92,727.00",19
Texas Ranchers (Major League Pickleball Team),09/27/23,"RA-0410 Fund I, a series of Red Beard Ventures Syndicates, LP",Seed,Non Tech,SPV,Equity Round,common,Yes,"$344,934.14",-,"$5,000,000.00","$6,750,000.00",post-money,10/20/23,$0.00,"$329,448.42",$1,$1,"540,000.00",105
Venus Aerospace,10/16/23,"VE-0601 Fund III, a series of Red Beard Ventures Syndicates, LP",Series A+,Aerospace,SPV,Equity Round,preferred,No,"$11,449.76",-,"$25,000,000.00","$165,000,000.00",pre-money,10/16/23,$0.00,"$11,449.76",$4.76,$4.76,"6,212.00",17
One Earth Rising,10/20/23,"ON-0317 Fund I, a series of Red Beard Ventures Syndicates, LP",Pre-Seed,Gaming,SPV,SAFE,,-,"$31,639.88",20.00%,"$2,000,000.00","$10,000,000.00",post-money,10/20/23,$0.00,"$31,639.88",$0,$0,-,15
Anduril Industries,11/01/23,"Red Beard AN I, LP",,Aerospace,SPV,Equity Round,common,No,"$869,563.20",-,$0.00,"$8,480,000,000.00",post-money,02/09/24,$0.00,"$815,355.44",$20.64,$19.35,"42,130.00",52
Brightvine,11/03/23,"BR-0921 Fund I, a series of Red Beard Ventures Syndicates, LP",Seed+,Blockchain / Crypto,SPV,SAFE,,Yes,"$65,500.00",0.00%,"$4,700,000.00","$16,000,000.00",post-money,11/13/23,$0.00,"$65,500.00",$0,$0,-,10
Oortech,12/08/23,"OO-1004 Fund I, a series of Red Beard Ventures Syndicates, LP",Seed+,AI / ML,SPV,SAFE,,Yes,"$76,560.00",0.00%,"$5,000,000.00","$50,000,000.00",post-money,02/16/24,$0.00,"$76,560.00",$0,$0,"275,616.00",19
Minima,12/22/23,"MI-0927 Fund I, a series of Red Beard Ventures Syndicates, LP",Seed,Blockchain / Crypto,SPV,SAFE,,No,"$55,980.00",20.00%,"$2,000,000.00","$15,000,000.00",post-money,01/27/24,$0.00,"$55,980.00",$0,$0,-,16
Rally,02/12/24,"RA-0108 Fund I, a series of Red Beard Ventures Syndicates, LP",Other,Investment Platforms,SPV,Equity Round,preferred,Yes,"$177,220.90",-,"$5,000,000.00","$5,000,000.00",pre-money,02/13/24,$0.00,"$177,220.90",$0.11,$0.11,"1,572,585.00",57`;

// Simple CSV parser that handles quoted fields
function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.split('\n');
  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function main() {
  const rows = parseCSV(csvData);
  console.log(`Parsed ${rows.length} rows from CSV`);

  const API_URL = process.env.API_URL || 'https://investor-os-delta.vercel.app';

  try {
    const response = await fetch(`${API_URL}/api/syndicate/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    });

    const result = await response.json();
    console.log('Import result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Import failed:', error);
  }
}

main();
