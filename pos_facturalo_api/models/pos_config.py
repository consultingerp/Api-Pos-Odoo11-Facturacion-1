from odoo import (
    api,
    fields,
    models
)
import requests


class PosConfig(models.Model):
    _inherit = 'pos.config'

    is_facturalo_api = fields.Boolean(
        string='Facturalo Peru API'
    )
    iface_facturalo_url_endpoint = fields.Char(
        string='Endpoint url for Facturalo API'
    )
    iface_facturalo_token = fields.Char(
        string='Token for Facturalo API'
    )
    facturalo_endpoint_state = fields.Selection(
        [('draft', 'Draft'), ('success', 'Success'), ('error', 'Error')],
        string='Is the URL endpoint valid?',
        default='draft'
    )

    @api.onchange('iface_facturalo_url_endpoint', 'iface_facturalo_token')
    def set_valid_endpoint(self):
        self.facturalo_endpoint_state = 'draft'

    @api.multi
    def test_facturalo_api_connection(self):
        self.ensure_one()
        headers = {'Authorization': 'Bearer ' + self.iface_facturalo_token}

        r = requests.post(
            self.iface_facturalo_url_endpoint,
            data={},
            headers=headers
        )
        if r.status_code == 404:
            self.facturalo_endpoint_state = 'error'
        else:
            self.facturalo_endpoint_state = 'success'
