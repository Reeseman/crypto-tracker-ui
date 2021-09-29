<template>
  <div class="wrapper">
    <h1>crypto-tracker</h1>

    <h2>Today's Summary</h2>
    <div class="totals">
      <div>
        <b>Total Investment: </b>
        {{ formatMoney(todayAggregate.initialUsd) }}
      </div>
      <div>
        <b>Current Worth After Tax: </b>
        {{ formatMoney(todayAggregate.initialUsd + (todayAggregate.currentUsd - todayAggregate.initialUsd) * (1 - estimatedTaxRate)) }}
      </div>
      <div>
        <b>Total Profits After Tax: </b>
        {{ formatMoney((todayAggregate.currentUsd - todayAggregate.initialUsd) * (1 - estimatedTaxRate)) }}
      </div>

      <div>&nbsp;</div>
      <div>
        <b>Total Target Profits: </b>
        {{ formatMoney((todayAggregate.ifAllGoesWell * (1 - estimatedTaxRate) + todayAggregate.initialUsd) - todayAggregate.initialUsd) }}
      </div>
      <div>
        <b>Final Target Worth: </b>
        {{ formatMoney(todayAggregate.ifAllGoesWell * (1 - estimatedTaxRate) + todayAggregate.initialUsd) }}
      </div>
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
        <tr v-for="(value, key, index) in todayAggregate.breakdown" :key="index">
          <td><b>{{ key }}</b></td>
          <td>{{ value.total_coin.toFixed(2) }}</td>
          <td>{{ formatMoney(value.usd_spent) }}</td>
          <td>{{ formatMoney(value['Current Value']) }}</td>
          <td>{{ formatMoney(value['Cost Basis']) }}</td>
          <td>{{ formatMoney(value['Target Price']) }}</td>
          <td>{{ formatMoney(value['Current Price']) }}</td>
          <td>{{ value['Target Mult'] }}</td>
          <td>{{ value['Progress'] }}</td>
          <td>{{ value['Multiplier'].toFixed(2) }}</td>
          <td>{{ formatMoney(targets[key] * value['total_coin'] - value['usd_spent']) }}</td>
          <td>{{ formatMoney(value['Current Value'] - value['usd_spent']) }}</td>
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
        estimatedTaxRate: 0.2,
      };
    },
    methods: {
      numberWithCommas(x) {
        var parts = x.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join(".");
      },
      formatMoney(x) {
        return x === undefined ? null : `$${this.numberWithCommas(x.toFixed(2))}`;
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
      appendPurchase(data, purchase) {
        purchase.coin = purchase.coin.toUpperCase();
        if (data.aggregate[purchase.coin] == undefined) {
          data.aggregate[purchase.coin] = {}
          data.aggregate[purchase.coin].usd_spent = 0;
          data.aggregate[purchase.coin].total_coin = 0;
          data.aggregate[purchase.coin].name = purchase.coin;
          data.aggregate[purchase.coin]['Target Price'] = targets[purchase.coin] == undefined ? null : targets[purchase.coin];
        }
        data.initialUsd += Number(purchase.usd_spent);
        data.aggregate[purchase.coin].usd_spent += purchase.usd_spent;
        data.aggregate[purchase.coin].total_coin += purchase.amount;
        return data;
      },
      aggregatePurchases(data, prices) {
        for (const key in data.aggregate) {
          var coinInfo = data.aggregate[key];
          const price = 1 / prices[coinInfo['name']];
          coinInfo['Current Price'] = price;
          const costBasis = coinInfo['usd_spent']/coinInfo['total_coin'];
          coinInfo['Cost Basis'] = costBasis;
          coinInfo['Multiplier'] = (price / (coinInfo['usd_spent']/coinInfo['total_coin']));
          coinInfo['Target Mult'] = (targets[key] / (coinInfo['usd_spent']/coinInfo['total_coin'])).toFixed(2);
          coinInfo['Progress'] = `${Math.round(100 * (price - costBasis) / (targets[key] - costBasis))}%`;
          const coinInUsd = this.turnCryptoIntoUsd(prices[coinInfo['name']], coinInfo['total_coin']);
          coinInfo['Current Value'] = coinInUsd;
          data.currentUsd += coinInUsd;
          const profit = targets[key] * data.aggregate[key]['total_coin'] - data.aggregate[key]['usd_spent'];
          data.ifAllGoesWell += profit;
        }
        return data;
      },
      async getFromApi() {

        let data = {aggregate: {}, currentUsd: 0, initialUsd: 0, ifAllGoesWell: 0};
        for (var i = 0; i < purchases.length; i++) {
          data = this.appendPurchase(data, purchases[i]);
        }

        let body = await this.getCryptoCompare(data.aggregate);
        if (body === '') {
          body = await this.getCoinbase();
        }
        data = this.aggregatePurchases(data, body);

        this.todayAggregate = {
          breakdown: this.sortAggByMultiplier(data.aggregate),
          initialUsd: data.initialUsd,
          currentUsd: data.currentUsd,
          ifAllGoesWell: data.ifAllGoesWell,
        };
      },
      async getCryptoCompare(aggregate) {
        var tsymsRequestValue = '';
        for (const key in aggregate) {
            tsymsRequestValue += key + ',';
        }

        const url = "https://min-api.cryptocompare.com/data/price?fsym=USD&tsyms=" + tsymsRequestValue;
        let output = '';
        await this.$axios.get(url).then(function (response) {
          output = response.data;
        }.bind(this)).catch(function (error) {console.log('ajax get branches error' + error); });
        return output;
      },
      async getCoinbase() {
        const url = 'https://api.coinbase.com/v2/exchange-rates?currency=usd'
        let output = '';
        await this.$axios.get(url).then(function (response) {
          output = response.data.data.rates;
        }.bind(this)).catch(function (error) {console.log('ajax get branches error' + error); });
        return output;
      }
    },
    created() {
      const todayKeyStr = this.$moment().format('YYYY-MM-DD');
      if (!calculations[todayKeyStr]) {
        this.getFromApi();
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
