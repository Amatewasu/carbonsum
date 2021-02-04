import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { loadStripe } from '@stripe/stripe-js';

@Component({
  selector: 'app-offset',
  templateUrl: './offset.page.html',
  styleUrls: ['./offset.page.scss'],
})
export class OffsetPage implements OnInit {

  private co2ToOffset : number = 100.0; // kgCO2e

  private stripe;

  private STRIPE_LIVE : boolean = true;
  private STRIPE_PUBLIC_TEST : string = 'pk_test_51HnqUzKvKe3TiwUfBHlyNOgeT70C4QxyBIexR7duRCUjabqQXk74z2Yf1Haub48bCwuD30swA0Ip103q0pfGHSkT00uV2L7ulN';
  private STRIPE_PUBLIC_LIVE : string = 'pk_live_51HnqUzKvKe3TiwUf8ELnmN3ahhlXy4dh52c9xwq24YokCkuuPZ4WzXykvxX3vElPHHeZlB7EJMZVjKK9opDXWYLu00XOuGqmJx';


  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    if (this.route.snapshot.paramMap.get('co2ToOffset')){
      this.co2ToOffset = parseFloat(this.route.snapshot.paramMap.get('co2ToOffset'));

      if (this.co2ToOffset < 25){
        this.co2ToOffset = 25.0;
      }
    }

    this.loadStripe();
  }

  async loadStripe(){
    this.stripe = await loadStripe(this.STRIPE_LIVE ? this.STRIPE_PUBLIC_LIVE : this.STRIPE_PUBLIC_TEST);
  }

  sendPaymentRequest(){
    let stripe = this.stripe;

    fetch(`https://us-central1-carbonsum.cloudfunctions.net/app/create-checkout-session${!this.STRIPE_LIVE ? "test=test" : ""}`, {
      method: "POST",
      body: JSON.stringify({ co2ToOffset: this.co2ToOffset }),
      headers: { "Content-Type": "application/json" }
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (session) {
        return stripe.redirectToCheckout({ sessionId: session.id });
      })
      .then(function (result) {
        // If redirectToCheckout fails due to a browser or network
        // error, you should display the localized error message to your
        // customer using error.message.
        if (result.error) {
          console.error(result.error.message);
        }
      })
      .catch(function (error) {
        console.error("Error:", error);
      });
  }

  updateValueToOffset(e){
    let el = e.target;
    let value = el.value;

    this.co2ToOffset = parseInt(value, 10);
  }
}
