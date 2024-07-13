# Binance Heikin-Ashi BOT

Binance Heikin-Ashi BOT is an automated trading program based on Heikin-Ashi.

## DISCLAIMER: Use at your own risk.

## Basic Usage

Make sure the cross wallet has a certain amount of USDT.

Install all dependencies.

```
npm i
```

Create `configs/env-config-mock.js` or `configs/env-config-real.js`, please refer to the `configs/env-config-example.js` content.

Trading parameters can be modified in `configs/trade-config.js`.

This command for mock trading.

```
npm run app:mock
```

This command for real trading.

```
npm run app:real
```

## Strategy

This robot will determine whether to place a trade based on Heikin-Ashi and volume.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[MIT](https://choosealicense.com/licenses/mit/)
