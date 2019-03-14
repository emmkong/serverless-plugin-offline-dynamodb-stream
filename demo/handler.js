/* @flow */

import { AnyExtensionField } from 'protobufjs';

export const handler: AWSLambda<any, AnyExtensionField> = async (
  event,
  { awsRequestId }
) => {
  console.log('EVENT ', event);
};
