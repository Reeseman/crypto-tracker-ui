<template>
  <div class="wrapper">
    <h1>crypto-tracker</h1>

    <h2>Today's Summary</h2>
    <div class="totals">
      <div><b>Total Investment:</b> ${{ totalInvestment }}</div>
      <!-- <div><b>Current Worth:</b> ${{ currentWorth }}</div> -->
      <div><b>Current Worth After Tax:</b> ${{ currentWorthAfterTax }}</div>
      <!-- <div><b>Total Profits:</b> ${{ totalProfits }}</div> -->
      <div><b>Total Profits After Tax:</b> ${{ totalProfitsAfterTax }}</div>

      <div>&nbsp;</div>
      <div><b>Total Target Profits:</b> ${{ totalTargetProfits }}</div>
      <div><b>Final Target Worth:</b> ${{ finalTargetWorth }}</div>
    </div>
    <h3 style='margin-bottom: 0;'>Breakdown</h3>
    <table class="todayAggregate">
      <thead>
        <tr>
          <td>Symbol</td>
          <td>Coins</td>
          <td>Investment</td>
          <td>Current Value</td>
          <td>Cost Basis</td>
          <td>Target Price</td>
          <td>Current Price</td>
          <td>Target Mult</td>
          <td>Progress</td>
          <td>Multiplier</td>
          <td>Target Profit</td>
          <td>Total Profit</td>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(value, key, index) in todayAggregate" :key="index">
          <td><b>{{ key }}</b></td>
          <td>{{ value.total_coin.toFixed(2) }}</td>
          <td>{{ numberWithCommas(value.Investment) }}</td>
          <td>{{ numberWithCommas(value['Current Value']) }}</td>
          <td>{{ numberWithCommas(value['Cost Basis']) }}</td>
          <td>{{ numberWithCommas(value['Target Price']) }}</td>
          <td>{{ numberWithCommas(value['Current Price']) }}</td>
          <td>{{ value['Target Mult'] }}</td>
          <td>{{ value['Progress'] }}</td>
          <td>{{ value['Multiplier'] }}</td>
          <td>{{ value['Target Profit'] }}</td>
          <td>{{ value['Total Profit'] }}</td>
        </tr>
      </tbody>
    </table>

    <h2>Targets</h2>
    <div class="targets">
      <div class="target" v-for="(item, key, index) in targets" :key="index">
        <b>{{ `${key}:` }} </b>{{ ` $${numberWithCommas(item.toFixed(2))}` }}
      </div>
    </div>

    <h2>Purchases</h2>
    <div class="purchases">
      <table>
        <thead>
          <tr>
            <td>Date</td>
            <td>Coin</td>
            <td>USD Spent</td>
            <td>Coins Purchased</td>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, key, index) in purchases" :key="index">
            <td>{{ item['date'] }}</td>
            <td>{{ item['coin'] }}</td>
            <td>{{ `$${numberWithCommas(item['usd_spent'])}` }}</td>
            <td>{{ item['amount'] }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="master-graph">
    </div>
  </div>
</template>

<script>
  import purchases from "../data/purchases.json";
  import targets from "../data/targets.json";
  import calculations from "../data/calculations.json";

  export default {
    name: 'Main',
    data: function() {
      return {
        targets, 
        purchases,
        calculations,
        todayAggregate: {},
        totalTargetProfits: 0,
        finalTargetWorth: 0,
        totalInvestment: 0,
        currentWorth: 0,
        currentWorthAfterTax: 0,
        totalProfits: 0,
        totalProfitsAfterTax: 0,
      };
    },
    methods: {
      numberWithCommas(x) {
        var parts = x.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join(".");
      },
      sortAggByMultiplier(aggregate) {
          var newAgg = {}
          var iterations = Object.keys(aggregate).length;
          for (var i = 0; i < iterations; i += 1) {
              var maxMultiplier = null;
              var maxMultiplierKey = null;
              for (const key in aggregate) {
                  if (maxMultiplier == null || parseFloat(aggregate[key]['Multiplier']) > maxMultiplier) {
                      maxMultiplier = parseFloat(aggregate[key]['Multiplier']);
                      maxMultiplierKey = key;
                  }
              }
              newAgg[maxMultiplierKey] = aggregate[maxMultiplierKey];
              delete aggregate[maxMultiplierKey];
          }
          return newAgg;
      },
      turnCryptoIntoUsd(converter, cryptoAmount) {
        return cryptoAmount * (1.0 / converter);
      },
    },
    beforeCreate() {
      var todayKeyStr = this.$moment().format('YYYYMMMMDh');
      if (!calculations[todayKeyStr]) {
        var aggregate = {};
        for (var i = 0; i < purchases.length; i++) {
            var purchase = purchases[i];
            purchase.coin = purchase.coin.toUpperCase();
            if (aggregate[`${purchase.coin}`] == undefined) {
                aggregate[`${purchase.coin}`] = {}
            }
        }

        var tsymsRequestValue = '';
        for (const key in aggregate) {
            tsymsRequestValue += key + ',';
        }

        const apiRequest = "https://min-api.cryptocompare.com/data/price?fsym=USD&tsyms=" + tsymsRequestValue;
        console.log(apiRequest);
        this.$axios.get(apiRequest).then((response) => {
          var currentUsd = 0;
          var initialUsd = 0;

          var aggregate = {};
          for (var i = 0; i < purchases.length; i++) {
              var purchase = purchases[i];
              purchase.coin = purchase.coin.toUpperCase();
              if (aggregate[`${purchase.coin}`] == undefined) {
                  aggregate[`${purchase.coin}`] = {}
                  aggregate[`${purchase.coin}`].usd_spent = 0;
                  aggregate[`${purchase.coin}`].total_coin = 0;
                  aggregate[`${purchase.coin}`].name = purchase.coin;
                  aggregate[`${purchase.coin}`]['Target Price'] = targets[purchase.coin] == undefined ? null : '$' + targets[purchase.coin];
              }
              aggregate[`${purchase.coin}`].usd_spent += purchase.usd_spent;
              aggregate[`${purchase.coin}`].total_coin += purchase.amount;
              initialUsd += purchase.usd_spent;
          }
          var body = response.data;
          var ifAllGoesWell = 0;
          for (const key in aggregate) {
            var coinInfo = aggregate[key];
            coinInfo['Coins'] = coinInfo['total_coin'].toFixed(4);
            const price = 1/body[coinInfo['name']];
            coinInfo['Current Price'] = '$' + price.toFixed(2);
            const costBasis = coinInfo['usd_spent']/coinInfo['total_coin'];
            coinInfo['Cost Basis'] = '$' + costBasis.toFixed(2);
            coinInfo['Multiplier'] = (price / (coinInfo['usd_spent']/coinInfo['total_coin'])).toFixed(2);
            coinInfo['Target Mult'] = (targets[key] / (coinInfo['usd_spent']/coinInfo['total_coin'])).toFixed(2);
            coinInfo['Progress'] = `${Math.round(100 * (price - costBasis) / (targets[key] - costBasis))}%`;
            const coinInUsd = this.turnCryptoIntoUsd(body[coinInfo['name']], coinInfo['total_coin']);
            coinInfo['Current Value'] = coinInUsd.toFixed(2);
            currentUsd += coinInUsd;
          }

          for (const key in aggregate) {
            aggregate[key]['Total Profit'] = '$' + this.numberWithCommas((aggregate[key]['Current Value'] - aggregate[key]['usd_spent']).toFixed(0));
            const profit = targets[key] * aggregate[key]['Coins'] - aggregate[key]['usd_spent'];
            aggregate[key]['Target Profit'] = '$' + this.numberWithCommas(profit.toFixed(0));
            ifAllGoesWell += profit;
            aggregate[key]['Current Value'] = '$' + aggregate[key]['Current Value']
            aggregate[key]['Investment'] = '$' + aggregate[key]['usd_spent'];
          }
          this.todayAggregate = this.sortAggByMultiplier(aggregate);

        // totalProfits: 0,
        // totalProfitsAfterTax: 0,
          const ESTIMATED_TAX_RATE = 0.2;

          const ifAllGoesWellTaxed = ifAllGoesWell * (1 - ESTIMATED_TAX_RATE);
          this.totalTargetProfits = this.numberWithCommas(ifAllGoesWellTaxed.toFixed(2));
          this.finalTargetWorth = this.numberWithCommas((ifAllGoesWellTaxed + initialUsd).toFixed(2));
          this.totalInvestment = this.numberWithCommas(initialUsd.toFixed(2));
          this.currentWorth = this.numberWithCommas(currentUsd.toFixed(2));
          const curRealWorth = (initialUsd + (currentUsd - initialUsd) * (1 - ESTIMATED_TAX_RATE)).toFixed(2);
          this.currentWorthAfterTax = this.numberWithCommas(curRealWorth);

          const totalGains = (currentUsd - initialUsd).toFixed(2);
          this.totalProfits = this.numberWithCommas(totalGains);
          const posttaxGains = (currentUsd - initialUsd) * (1 - ESTIMATED_TAX_RATE);
          this.totalProfitsAfterTax = this.numberWithCommas(posttaxGains.toFixed(2));
        });
      } else {
        this.todayAggregate = calculations[todayKeyStr];
      }
    },
  };
</script>

<style scoped>
  div.totals {
/*    display: flex;
    flex-wrap: wrap;
*/  }

  div.totals > div {
/*    padding: 5px;
    margin: 0 5px 0 5px;
*/  }

  div.purchases > table td {
    padding: 5px;
    border: 1px solid black;
  }

  div.targets {
    display: flex; /* or inline-flex */
    flex-wrap: wrap;
  }

  div.targets > div.target {
    padding: 5px;
    margin: 0 5px 0 5px;
  }

  table.todayAggregate td {
    padding: 5px;
    border: 1px solid black;
  }
  table.todayAggregate thead td {
    font-weight:  bold;
  }
</style>
